/**
 * Loitering Detector Service
 * Detects vessels staying in small areas for extended periods
 */

import { Vessel } from '../types/ais';
import { LoiteringEvent, Point, DetectionConfig } from '../types/activity';

interface VesselLoiteringState {
  mmsi: string;
  positions: Array<{ position: Point; timestamp: Date; speed: number }>;
  startTime: Date;
  centerPoint: Point;
  maxRadius: number;
}

export class LoiteringDetector {
  private vesselStates: Map<string, VesselLoiteringState> = new Map();
  private activeLoitering: Map<string, LoiteringEvent> = new Map();
  private completedLoitering: LoiteringEvent[] = [];
  private config: DetectionConfig['loitering'];

  constructor(config?: Partial<DetectionConfig['loitering']>) {
    this.config = {
      durationThreshold: 7200, // 2 hours in seconds
      speedThreshold: 3.0, // 3 knots
      radiusThreshold: 0.2, // 0.2 NM
      ...config
    };
  }

  /**
   * Detect loitering behavior
   */
  public async detectLoitering(vessels: Vessel[]): Promise<LoiteringEvent[]> {
    const newEvents: LoiteringEvent[] = [];

    for (const vessel of vessels) {
      const event = await this.checkVessel(vessel);
      if (event) {
        newEvents.push(event);
      }
    }

    // Clean up vessels that have started moving
    this.cleanupMovingVessels(vessels);

    return newEvents;
  }

  /**
   * Check a single vessel for loitering
   */
  private async checkVessel(vessel: Vessel): Promise<LoiteringEvent | null> {
    const mmsi = vessel.mmsi.toString();
    const isSlowOrStationary = !vessel.speed || vessel.speed < this.config.speedThreshold;

    if (!isSlowOrStationary) {
      // Vessel is moving, check if it was loitering
      return this.handleVesselDeparture(mmsi);
    }

    // Vessel is slow/stationary
    let state = this.vesselStates.get(mmsi);

    if (!state) {
      // Start tracking this vessel
      state = {
        mmsi,
        positions: [],
        startTime: new Date(),
        centerPoint: vessel.position,
        maxRadius: 0
      };
      this.vesselStates.set(mmsi, state);
    }

    // Add position to history
    state.positions.push({
      position: vessel.position,
      timestamp: new Date(),
      speed: vessel.speed || 0
    });

    // Keep only last 4 hours of positions
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    state.positions = state.positions.filter(p => p.timestamp > fourHoursAgo);

    // Update center point (geometric center of all positions)
    state.centerPoint = this.calculateCenterPoint(state.positions);

    // Calculate maximum radius from center
    state.maxRadius = Math.max(
      ...state.positions.map(p =>
        this.calculateDistance(p.position, state.centerPoint)
      )
    );

    // Check if vessel meets loitering criteria
    const duration = (new Date().getTime() - state.startTime.getTime()) / 1000;

    if (
      duration >= this.config.durationThreshold &&
      state.maxRadius <= this.config.radiusThreshold
    ) {
      // Check if already flagged as active loitering
      if (!this.activeLoitering.has(mmsi)) {
        const event = this.createLoiteringEvent(vessel, state);
        this.activeLoitering.set(mmsi, event);
        return event;
      } else {
        // Update existing event
        const event = this.activeLoitering.get(mmsi)!;
        event.duration = duration;
        event.radius = state.maxRadius;
      }
    }

    return null;
  }

  /**
   * Handle vessel departure from loitering area
   */
  private handleVesselDeparture(mmsi: string): LoiteringEvent | null {
    const state = this.vesselStates.get(mmsi);
    const activeEvent = this.activeLoitering.get(mmsi);

    if (state && activeEvent) {
      // Complete the loitering event
      activeEvent.endTime = new Date();
      activeEvent.duration = (activeEvent.endTime.getTime() - activeEvent.startTime.getTime()) / 1000;

      this.activeLoitering.delete(mmsi);
      this.completedLoitering.push(activeEvent);

      // Clean up state
      this.vesselStates.delete(mmsi);

      return activeEvent;
    }

    // Clean up if exists
    this.vesselStates.delete(mmsi);

    return null;
  }

  /**
   * Clean up vessels that have started moving
   */
  private cleanupMovingVessels(vessels: Vessel[]): void {
    const currentVessels = new Set(vessels.map(v => v.mmsi.toString()));

    // Remove vessels no longer in the area
    for (const mmsi of this.vesselStates.keys()) {
      if (!currentVessels.has(mmsi)) {
        this.vesselStates.delete(mmsi);
        this.activeLoitering.delete(mmsi);
      }
    }
  }

  /**
   * Create loitering event
   */
  private createLoiteringEvent(
    vessel: Vessel,
    state: VesselLoiteringState
  ): LoiteringEvent {
    const duration = (new Date().getTime() - state.startTime.getTime()) / 1000;
    const speeds = state.positions.map(p => p.speed);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);

    return {
      id: this.generateEventId(vessel.mmsi.toString()),
      vessel: vessel.mmsi.toString(),
      startTime: state.startTime,
      location: state.centerPoint,
      duration,
      radius: state.maxRadius,
      averageSpeed,
      maxSpeed,
      inAnchorageArea: this.isInAnchorageArea(state.centerPoint),
      vesselType: vessel.vesselType
    };
  }

  /**
   * Calculate center point of positions
   */
  private calculateCenterPoint(
    positions: Array<{ position: Point; timestamp: Date; speed: number }>
  ): Point {
    if (positions.length === 0) {
      return { latitude: 0, longitude: 0 };
    }

    const sum = positions.reduce(
      (acc, p) => ({
        lat: acc.lat + p.position.latitude,
        lon: acc.lon + p.position.longitude
      }),
      { lat: 0, lon: 0 }
    );

    return {
      latitude: sum.lat / positions.length,
      longitude: sum.lon / positions.length
    };
  }

  /**
   * Check if position is in an anchorage area
   */
  private isInAnchorageArea(position: Point): boolean {
    // Known anchorage areas in Caspian Sea (simplified)
    const anchorageAreas = [
      { lat: 40.392, lon: 49.867, radius: 0.15 }, // Baku anchorage
      { lat: 40.004, lon: 50.285, radius: 0.1 },  // Sumqayit anchorage
      { lat: 38.458, lon: 48.866, radius: 0.12 }, // Bandar-e Anzali anchorage
      { lat: 39.733, lon: 51.833, radius: 0.1 },  // Aktau anchorage
      { lat: 44.617, lon: 50.083, radius: 0.1 }   // Makhachkala anchorage
    ];

    for (const anchorage of anchorageAreas) {
      const dist = this.calculateDistance(
        position,
        { latitude: anchorage.lat, longitude: anchorage.lon }
      );
      if (dist <= anchorage.radius) {
        return true;
      }
    }

    return false;
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
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Generate event ID
   */
  private generateEventId(mmsi: string): string {
    return `loitering_${mmsi}_${Date.now()}`;
  }

  /**
   * Get all completed loitering events
   */
  public getCompletedLoitering(): LoiteringEvent[] {
    return [...this.completedLoitering];
  }

  /**
   * Get active loitering events
   */
  public getActiveLoitering(): LoiteringEvent[] {
    return Array.from(this.activeLoitering.values());
  }

  /**
   * Get vessel loitering state
   */
  public getVesselState(mmsi: string): VesselLoiteringState | null {
    return this.vesselStates.get(mmsi) || null;
  }

  /**
   * Clean up old completed events
   */
  public cleanup(maxAgeHours: number = 24): number {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const before = this.completedLoitering.length;

    this.completedLoitering = this.completedLoitering.filter(
      event => event.startTime > cutoff
    );

    return before - this.completedLoitering.length;
  }

  /**
   * Get loitering statistics
   */
  public getStatistics() {
    return {
      activeLoitering: this.activeLoitering.size,
      completedLoitering: this.completedLoitering.length,
      vesselsTracked: this.vesselStates.size,
      byVesselType: this.groupByVesselType(),
      inAnchorageAreas: this.countInAnchorageAreas()
    };
  }

  /**
   * Group loitering events by vessel type
   */
  private groupByVesselType(): Record<number, number> {
    const grouped: Record<number, number> = {};

    for (const event of this.activeLoitering.values()) {
      if (event.vesselType !== undefined) {
        grouped[event.vesselType] = (grouped[event.vesselType] || 0) + 1;
      }
    }

    for (const event of this.completedLoitering) {
      if (event.vesselType !== undefined) {
        grouped[event.vesselType] = (grouped[event.vesselType] || 0) + 1;
      }
    }

    return grouped;
  }

  /**
   * Count loitering in anchorage areas
   */
  private countInAnchorageAreas(): number {
    let count = 0;

    for (const event of this.activeLoitering.values()) {
      if (event.inAnchorageArea) count++;
    }

    return count;
  }
}

export const loiteringDetector = new LoiteringDetector();