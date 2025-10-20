/**
 * AIS Simulation Service
 * Generates realistic AIS data for testing and demonstration purposes
 */

import { Vessel, AISMessageType, NavigationalStatus, VesselTypeCategory } from '../types';
import { vesselStore } from './vesselStore';
import { aisSimulationConfig } from '../config';

interface SimulatedVessel {
  mmsi: number;
  name: string;
  vesselType: number;
  position: {
    latitude: number;
    longitude: number;
  };
  course: number;
  speed: number;
  heading: number;
  status: number;
  destination?: string;
  dimension?: {
    length: number;
    width: number;
  };
  route: {
    waypoints: Array<{ latitude: number; longitude: number }>;
    currentWaypointIndex: number;
  };
}

export class AISSimulation {
  private vessels: Map<number, SimulatedVessel> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.initializeVessels();
  }

  /**
   * Initialize simulated vessels with realistic data
   */
  private initializeVessels(): void {
    const vesselNames = [
      'NORTHERN STAR', 'ATLANTIC WIND', 'PACIFIC DREAM', 'BALTIC SEA',
      'MEDITERRANEAN SUN', 'NORTH SEA EXPLORER', 'ARCTIC FOX', 'ANTARCTIC WAVE',
      'INDIAN OCEAN', 'SOUTHERN CROSS', 'EASTERN BELLE', 'WESTERN HOPE',
      'MORNING STAR', 'EVENING TIDE', 'MIDNIGHT SUN', 'GOLDEN HORIZON',
      'SILVER MOON', 'BLUE WHALE', 'RED DRAGON', 'GREEN EARTH'
    ];

    const destinations = [
      'ROTTERDAM', 'HAMBURG', 'ANTWERP', 'BREMEN', 'LE HAVRE',
      'SOUTHAMPTON', 'GOTHENBURG', 'COPENHAGEN', 'OSLO', 'STOCKHOLM',
      'HELSINKI', 'TALLINN', 'RIGA', 'KLAIPEDA', 'GDANSK'
    ];

    for (let i = 0; i < aisSimulationConfig.vesselCount; i++) {
      const mmsi = 2000000000 + i + 1; // Generate unique MMSI numbers
      const vesselType = this.getRandomVesselType();
      
      const vessel: SimulatedVessel = {
        mmsi,
        name: vesselNames[i % vesselNames.length] + ' ' + Math.floor(i / vesselNames.length + 1),
        vesselType,
        position: this.generateRandomPosition(),
        course: Math.random() * 360,
        speed: this.getRandomSpeed(vesselType),
        heading: Math.random() * 360,
        status: this.getRandomStatus(),
        destination: destinations[Math.floor(Math.random() * destinations.length)],
        dimension: this.generateVesselDimensions(vesselType),
        route: this.generateRandomRoute()
      };

      this.vessels.set(mmsi, vessel);
    }
  }

  /**
   * Get random vessel type based on realistic distribution
   */
  private getRandomVesselType(): number {
    const types = [
      VesselTypeCategory.CARGO,
      VesselTypeCategory.TANKER,
      VesselTypeCategory.PASSENGER,
      VesselTypeCategory.FISHING,
      VesselTypeCategory.TUG,
      VesselTypeCategory.HIGH_SPEED
    ];
    
    const weights = [0.4, 0.25, 0.15, 0.1, 0.05, 0.05]; // Realistic distribution
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return types[i];
      }
    }
    
    return VesselTypeCategory.CARGO;
  }

  /**
   * Generate random position within simulation bounds
   */
  private generateRandomPosition(): { latitude: number; longitude: number } {
    return {
      latitude: aisSimulationConfig.areaBounds.south + 
               Math.random() * (aisSimulationConfig.areaBounds.north - aisSimulationConfig.areaBounds.south),
      longitude: aisSimulationConfig.areaBounds.west + 
                Math.random() * (aisSimulationConfig.areaBounds.east - aisSimulationConfig.areaBounds.west)
    };
  }

  /**
   * Get realistic speed based on vessel type
   */
  private getRandomSpeed(vesselType: number): number {
    const speedRanges: Record<number, { min: number; max: number }> = {
      [VesselTypeCategory.CARGO]: { min: 10, max: 20 },
      [VesselTypeCategory.TANKER]: { min: 12, max: 18 },
      [VesselTypeCategory.PASSENGER]: { min: 15, max: 25 },
      [VesselTypeCategory.FISHING]: { min: 5, max: 12 },
      [VesselTypeCategory.TUG]: { min: 8, max: 15 },
      [VesselTypeCategory.HIGH_SPEED]: { min: 20, max: 35 }
    };

    const range = speedRanges[vesselType] || speedRanges[VesselTypeCategory.CARGO];
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * Get random navigational status
   */
  private getRandomStatus(): number {
    const statuses = [
      NavigationalStatus.UNDER_WAY_USING_ENGINE,
      NavigationalStatus.AT_ANCHOR,
      NavigationalStatus.MOORED,
      NavigationalStatus.NOT_UNDER_COMMAND
    ];
    
    const weights = [0.7, 0.15, 0.1, 0.05]; // Most vessels are underway
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return statuses[i];
      }
    }
    
    return NavigationalStatus.UNDER_WAY_USING_ENGINE;
  }

  /**
   * Generate vessel dimensions based on type
   */
  private generateVesselDimensions(vesselType: number): { length: number; width: number } {
    const dimensions: Record<number, { length: number; width: number }> = {
      [VesselTypeCategory.CARGO]: { length: 200, width: 30 },
      [VesselTypeCategory.TANKER]: { length: 250, width: 40 },
      [VesselTypeCategory.PASSENGER]: { length: 180, width: 25 },
      [VesselTypeCategory.FISHING]: { length: 30, width: 8 },
      [VesselTypeCategory.TUG]: { length: 25, width: 10 },
      [VesselTypeCategory.HIGH_SPEED]: { length: 40, width: 8 }
    };

    const base = dimensions[vesselType] || dimensions[VesselTypeCategory.CARGO];
    return {
      length: base.length * (0.8 + Math.random() * 0.4), // ±20% variation
      width: base.width * (0.8 + Math.random() * 0.4)
    };
  }

  /**
   * Generate random route for vessel
   */
  private generateRandomRoute(): {
    waypoints: Array<{ latitude: number; longitude: number }>;
    currentWaypointIndex: number;
  } {
    const numWaypoints = 3 + Math.floor(Math.random() * 5); // 3-7 waypoints
    const waypoints = [];
    
    for (let i = 0; i < numWaypoints; i++) {
      waypoints.push(this.generateRandomPosition());
    }
    
    return {
      waypoints,
      currentWaypointIndex: 0
    };
  }

  /**
   * Start the AIS simulation
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('AIS simulation is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting AIS simulation with ${this.vessels.size} vessels`);

    this.interval = setInterval(async () => {
      await this.updateVessels();
    }, aisSimulationConfig.updateInterval);

    // Initial vessel creation
    await this.updateVessels();
  }

  /**
   * Stop the AIS simulation
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('AIS simulation stopped');
  }

  /**
   * Update all vessel positions and store them
   */
  private async updateVessels(): Promise<void> {
    const updatedVessels: Vessel[] = [];

    for (const [mmsi, simVessel] of this.vessels.entries()) {
      // Update vessel position
      this.updateVesselPosition(simVessel);

      // Convert to Vessel format
      const vessel: Vessel = {
        id: `vessel_${mmsi}`,
        mmsi: simVessel.mmsi,
        name: simVessel.name,
        callSign: `${simVessel.mmsi.toString().slice(-6)}`,
        vesselType: simVessel.vesselType,
        position: simVessel.position,
        course: simVessel.course,
        speed: simVessel.speed,
        heading: simVessel.heading,
        status: simVessel.status,
        timestamp: new Date(),
        lastUpdate: new Date(),
        source: 'AIS',
        dimension: simVessel.dimension,
        destination: simVessel.destination
      };

      updatedVessels.push(vessel);
    }

    // Store all updated vessels
    for (const vessel of updatedVessels) {
      try {
        await vesselStore.storeVessel(vessel);
      } catch (error) {
        console.error(`Failed to store vessel ${vessel.mmsi}:`, error);
      }
    }

    console.log(`Updated ${updatedVessels.length} vessels`);
  }

  /**
   * Update single vessel position based on route and speed
   */
  private updateVesselPosition(vessel: SimulatedVessel): void {
    if (vessel.status === NavigationalStatus.AT_ANCHOR || 
        vessel.status === NavigationalStatus.MOORED) {
      // Stationary vessels don't move
      return;
    }

    const currentWaypoint = vessel.route.waypoints[vessel.route.currentWaypointIndex];
    if (!currentWaypoint) {
      // Reached end of route, generate new route
      vessel.route = this.generateRandomRoute();
      return;
    }

    // Calculate distance to waypoint
    const distance = this.calculateDistance(
      vessel.position,
      currentWaypoint
    );

    // Check if reached waypoint
    if (distance < 0.1) { // Within 0.1 NM
      vessel.route.currentWaypointIndex++;
      if (vessel.route.currentWaypointIndex >= vessel.route.waypoints.length) {
        // Reached end of route, generate new route
        vessel.route = this.generateRandomRoute();
      }
      return;
    }

    // Move towards waypoint
    const bearing = this.calculateBearing(vessel.position, currentWaypoint);
    vessel.course = bearing;
    vessel.heading = bearing;

    // Calculate new position
    const timeHours = aisSimulationConfig.updateInterval / (1000 * 60 * 60); // Convert ms to hours
    const distanceTraveled = vessel.speed * timeHours; // Distance in NM

    const newPosition = this.calculatePositionFromBearing(
      vessel.position,
      bearing,
      distanceTraveled
    );

    vessel.position = newPosition;

    // Occasionally change status for realism
    if (Math.random() < 0.01) { // 1% chance per update
      vessel.status = this.getRandomStatus();
    }
  }

  /**
   * Calculate distance between two points in nautical miles
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.latitude)) * 
              Math.cos(this.toRadians(point2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing from point1 to point2 in degrees
   */
  private calculateBearing(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  /**
   * Calculate new position from bearing and distance
   */
  private calculatePositionFromBearing(
    start: { latitude: number; longitude: number },
    bearing: number,
    distance: number
  ): { latitude: number; longitude: number } {
    const R = 3440.065; // Earth's radius in nautical miles
    const bearingRad = this.toRadians(bearing);
    const lat1 = this.toRadians(start.latitude);
    const lon1 = this.toRadians(start.longitude);
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
    );
    
    const lon2 = lon1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return {
      latitude: this.toDegrees(lat2),
      longitude: this.toDegrees(lon2)
    };
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get current simulation status
   */
  public getStatus(): { running: boolean; vesselCount: number } {
    return {
      running: this.isRunning,
      vesselCount: this.vessels.size
    };
  }

  /**
   * Add a new vessel to the simulation
   */
  public addVessel(vessel: Partial<SimulatedVessel>): void {
    const mmsi = vessel.mmsi || 2000000000 + this.vessels.size + 1;
    const newVessel: SimulatedVessel = {
      mmsi,
      name: vessel.name || `SIMULATED VESSEL ${mmsi}`,
      vesselType: vessel.vesselType || VesselTypeCategory.CARGO,
      position: vessel.position || this.generateRandomPosition(),
      course: vessel.course || Math.random() * 360,
      speed: vessel.speed || this.getRandomSpeed(vessel.vesselType || VesselTypeCategory.CARGO),
      heading: vessel.heading || Math.random() * 360,
      status: vessel.status || NavigationalStatus.UNDER_WAY_USING_ENGINE,
      destination: vessel.destination,
      dimension: vessel.dimension || this.generateVesselDimensions(vessel.vesselType || VesselTypeCategory.CARGO),
      route: vessel.route || this.generateRandomRoute()
    };

    this.vessels.set(mmsi, newVessel);
  }

  /**
   * Remove a vessel from the simulation
   */
  public removeVessel(mmsi: number): boolean {
    return this.vessels.delete(mmsi);
  }
}

export const aisSimulationService = new AISSimulation();