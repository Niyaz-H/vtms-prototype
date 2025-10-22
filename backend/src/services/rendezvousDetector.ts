/**
 * Rendezvous Detector Service
 * Detects suspicious vessel meetings (potential contraband transfers)
 */

import { Vessel } from '../types/ais';
import {
  RendezvousEvent,
  VesselPair,
  Point,
  DetectionConfig
} from '../types/activity';

export class RendezvousDetector {
  private vesselPairs: Map<string, VesselPair> = new Map();
  private activeRendezvous: Map<string, RendezvousEvent> = new Map();
  private completedRendezvous: RendezvousEvent[] = [];
  private vesselHistory: Map<string, Vessel[]> = new Map();
  private config: DetectionConfig['rendezvous'];

  constructor(config?: Partial<DetectionConfig['rendezvous']>) {
    this.config = {
      proximityThreshold: 0.5, // 0.5 NM
      durationThreshold: 300, // 5 minutes
      speedThreshold: 3.0, // 3 knots
      minSeparationBefore: 5.0, // 5 NM
      ...config
    };
  }

  /**
   * Track vessel positions over time
   */
  public trackVessel(vessel: Vessel): void {
    const mmsi = vessel.mmsi.toString();
    
    if (!this.vesselHistory.has(mmsi)) {
      this.vesselHistory.set(mmsi, []);
    }

    const history = this.vesselHistory.get(mmsi)!;
    history.push(vessel);

    // Keep only last 2 hours of history
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    this.vesselHistory.set(
      mmsi,
      history.filter(v => v.timestamp > twoHoursAgo)
    );
  }

  /**
   * Detect rendezvous between vessels
   */
  public async detectRendezvous(vessels: Vessel[]): Promise<RendezvousEvent[]> {
    const newEvents: RendezvousEvent[] = [];

    // Track all vessels
    for (const vessel of vessels) {
      this.trackVessel(vessel);
    }

    // Check all vessel pairs
    for (let i = 0; i < vessels.length; i++) {
      for (let j = i + 1; j < vessels.length; j++) {
        const vessel1 = vessels[i];
        const vessel2 = vessels[j];

        const event = await this.checkVesselPair(vessel1, vessel2);
        if (event) {
          newEvents.push(event);
        }
      }
    }

    return newEvents;
  }

  /**
   * Check a specific vessel pair for rendezvous
   */
  private async checkVesselPair(
    vessel1: Vessel,
    vessel2: Vessel
  ): Promise<RendezvousEvent | null> {
    const pairKey = this.getPairKey(
      vessel1.mmsi.toString(),
      vessel2.mmsi.toString()
    );

    const distance = this.calculateDistance(
      vessel1.position,
      vessel2.position
    );

    // Update or create vessel pair tracking
    this.updateVesselPair(vessel1, vessel2, distance);

    // Check if vessels are in proximity
    if (distance <= this.config.proximityThreshold) {
      return await this.handleProximityEvent(vessel1, vessel2, distance, pairKey);
    } else {
      // Check if vessels were in proximity and are now departing
      return await this.handleDepartureEvent(vessel1, vessel2, pairKey);
    }
  }

  /**
   * Handle vessels entering proximity
   */
  private async handleProximityEvent(
    vessel1: Vessel,
    vessel2: Vessel,
    distance: number,
    pairKey: string
  ): Promise<RendezvousEvent | null> {
    const activeEvent = this.activeRendezvous.get(pairKey);

    if (!activeEvent) {
      // Check if vessels were previously separated
      const wereSeparated = await this.werePreviouslySeparated(
        vessel1.mmsi.toString(),
        vessel2.mmsi.toString()
      );

      if (!wereSeparated) {
        return null; // Don't create event if vessels weren't separated
      }

      // Check if vessels are moving slowly (potential meeting)
      const vessel1Slow = !vessel1.speed || vessel1.speed < this.config.speedThreshold;
      const vessel2Slow = !vessel2.speed || vessel2.speed < this.config.speedThreshold;

      if (vessel1Slow && vessel2Slow) {
        // Start new rendezvous event
        const event: RendezvousEvent = {
          id: this.generateEventId(vessel1.mmsi.toString(), vessel2.mmsi.toString()),
          vessel1: vessel1.mmsi.toString(),
          vessel2: vessel2.mmsi.toString(),
          startTime: new Date(),
          meetingLocation: {
            latitude: (vessel1.position.latitude + vessel2.position.latitude) / 2,
            longitude: (vessel1.position.longitude + vessel2.position.longitude) / 2
          },
          approachDistance: distance,
          duration: 0,
          vessel1SpeedBefore: this.getAverageSpeed(vessel1.mmsi.toString(), 10),
          vessel1SpeedDuring: vessel1.speed || 0,
          vessel2SpeedBefore: this.getAverageSpeed(vessel2.mmsi.toString(), 10),
          vessel2SpeedDuring: vessel2.speed || 0,
          minimumDistance: distance,
          inPortArea: this.isInPortArea(vessel1.position)
        };

        this.activeRendezvous.set(pairKey, event);
      }
    } else {
      // Update existing rendezvous event
      const duration = (new Date().getTime() - activeEvent.startTime.getTime()) / 1000;
      activeEvent.duration = duration;
      activeEvent.minimumDistance = Math.min(activeEvent.minimumDistance, distance);
      activeEvent.vessel1SpeedDuring = vessel1.speed || 0;
      activeEvent.vessel2SpeedDuring = vessel2.speed || 0;
    }

    return null;
  }

  /**
   * Handle vessels departing after proximity
   */
  private async handleDepartureEvent(
    vessel1: Vessel,
    vessel2: Vessel,
    pairKey: string
  ): Promise<RendezvousEvent | null> {
    const activeEvent = this.activeRendezvous.get(pairKey);

    if (!activeEvent) {
      return null;
    }

    // Check if rendezvous duration exceeds threshold
    const duration = (new Date().getTime() - activeEvent.startTime.getTime()) / 1000;

    if (duration >= this.config.durationThreshold) {
      // Complete the rendezvous event
      activeEvent.endTime = new Date();
      activeEvent.duration = duration;
      activeEvent.vessel1SpeedAfter = vessel1.speed || 0;
      activeEvent.vessel2SpeedAfter = vessel2.speed || 0;

      this.activeRendezvous.delete(pairKey);
      this.completedRendezvous.push(activeEvent);

      return activeEvent;
    } else {
      // Rendezvous too short, discard
      this.activeRendezvous.delete(pairKey);
    }

    return null;
  }

  /**
   * Check if vessels were previously separated
   */
  private async werePreviouslySeparated(
    mmsi1: string,
    mmsi2: string
  ): Promise<boolean> {
    const history1 = this.vesselHistory.get(mmsi1);
    const history2 = this.vesselHistory.get(mmsi2);

    if (!history1 || !history2 || history1.length < 5 || history2.length < 5) {
      return false;
    }

    // Check if vessels were more than minSeparationBefore apart in recent history
    const recentHistory1 = history1.slice(-10);
    const recentHistory2 = history2.slice(-10);

    for (const v1 of recentHistory1.slice(0, 5)) {
      const closestV2 = this.findClosestInTime(v1, recentHistory2);
      if (closestV2) {
        const dist = this.calculateDistance(v1.position, closestV2.position);
        if (dist >= this.config.minSeparationBefore) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find closest vessel position in time
   */
  private findClosestInTime(target: Vessel, vessels: Vessel[]): Vessel | null {
    if (vessels.length === 0) return null;

    return vessels.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.timestamp.getTime() - target.timestamp.getTime());
      const currentDiff = Math.abs(current.timestamp.getTime() - target.timestamp.getTime());
      return currentDiff < closestDiff ? current : closest;
    });
  }

  /**
   * Calculate average speed from vessel history
   */
  private getAverageSpeed(mmsi: string, minutes: number): number {
    const history = this.vesselHistory.get(mmsi);
    if (!history || history.length === 0) return 0;

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recent = history.filter(v => v.timestamp > cutoff);

    if (recent.length === 0) return 0;

    const totalSpeed = recent.reduce((sum, v) => sum + (v.speed || 0), 0);
    return totalSpeed / recent.length;
  }

  /**
   * Check if position is in a port area (simplified)
   */
  private isInPortArea(position: Point): boolean {
    // Known port areas in Caspian Sea (simplified)
    const portAreas = [
      { lat: 40.392, lon: 49.867, radius: 0.1 }, // Baku
      { lat: 40.004, lon: 50.285, radius: 0.08 }, // Sumqayit
      { lat: 38.458, lon: 48.866, radius: 0.1 }   // Bandar-e Anzali
    ];

    for (const port of portAreas) {
      const dist = this.calculateDistance(
        position,
        { latitude: port.lat, longitude: port.lon }
      );
      if (dist <= port.radius) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update vessel pair tracking
   */
  private updateVesselPair(vessel1: Vessel, vessel2: Vessel, distance: number): void {
    const pairKey = this.getPairKey(
      vessel1.mmsi.toString(),
      vessel2.mmsi.toString()
    );

    let pair = this.vesselPairs.get(pairKey);

    if (!pair) {
      pair = {
        vessel1: vessel1.mmsi.toString(),
        vessel2: vessel2.mmsi.toString(),
        firstEncounter: new Date(),
        lastUpdate: new Date(),
        encounters: 0,
        distances: [],
        locations: []
      };
      this.vesselPairs.set(pairKey, pair);
    }

    pair.lastUpdate = new Date();
    pair.distances.push(distance);
    pair.locations.push({
      latitude: (vessel1.position.latitude + vessel2.position.latitude) / 2,
      longitude: (vessel1.position.longitude + vessel2.position.longitude) / 2
    });

    // Keep only last 100 data points
    if (pair.distances.length > 100) {
      pair.distances = pair.distances.slice(-100);
      pair.locations = pair.locations.slice(-100);
    }
  }

  /**
   * Calculate distance between two points (nautical miles)
   */
  private calculateDistance(point1: Point, point2: Point): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get vessel pair key
   */
  private getPairKey(mmsi1: string, mmsi2: string): string {
    return [mmsi1, mmsi2].sort().join('-');
  }

  /**
   * Generate event ID
   */
  private generateEventId(mmsi1: string, mmsi2: string): string {
    return `rendezvous_${this.getPairKey(mmsi1, mmsi2)}_${Date.now()}`;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Get all completed rendezvous events
   */
  public getCompletedRendezvous(): RendezvousEvent[] {
    return [...this.completedRendezvous];
  }

  /**
   * Get active rendezvous events
   */
  public getActiveRendezvous(): RendezvousEvent[] {
    return Array.from(this.activeRendezvous.values());
  }

  /**
   * Clear old completed events
   */
  public cleanup(maxAgeHours: number = 24): number {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const before = this.completedRendezvous.length;

    this.completedRendezvous = this.completedRendezvous.filter(
      event => event.startTime > cutoff
    );

    return before - this.completedRendezvous.length;
  }
}

export const rendezvousDetector = new RendezvousDetector();