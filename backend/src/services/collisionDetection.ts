/**
 * Collision Detection Service
 * Implements spatial indexing and collision prediction algorithms
 */

import {
  Vessel,
  CollisionAlert,
  CollisionDetectionConfig,
  CollisionDetectionResult,
  VesselProximity,
  Point,
  BoundingBox,
  QuadTree,
  AlertLevel
} from '../types';
import { collisionDetectionConfig } from '../config';
import { vesselStore } from './vesselStore';

export class CollisionDetection {
  private config: CollisionDetectionConfig;
  private alerts: Map<string, CollisionAlert> = new Map();
  private spatialIndex: QuadTree | null = null;
  private lastUpdate: Date = new Date();

  constructor(config?: Partial<CollisionDetectionConfig>) {
    this.config = { ...collisionDetectionConfig, ...config };
  }

  /**
   * Run collision detection on all active vessels
   */
  public async detectCollisions(): Promise<CollisionDetectionResult> {
    const startTime = Date.now();
    
    try {
      const vessels = await vesselStore.getAllVessels();
      const activeVessels = vessels.filter(vessel => 
        vessel.speed && vessel.speed >= this.config.minSpeed
      );

      // Build spatial index
      this.buildSpatialIndex(activeVessels);

      // Detect potential collisions
      const newAlerts = await this.detectPotentialCollisions(activeVessels);

      // Update existing alerts
      this.updateExistingAlerts(activeVessels);

      // Resolve old alerts
      this.resolveOldAlerts();

      const processingTime = Date.now() - startTime;
      this.lastUpdate = new Date();

      return {
        alerts: Array.from(this.alerts.values()),
        processedVessels: activeVessels.length,
        processingTime,
        timestamp: this.lastUpdate
      };

    } catch (error) {
      console.error('Collision detection failed:', error);
      return {
        alerts: [],
        processedVessels: 0,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Build QuadTree spatial index for efficient proximity queries
   */
  private buildSpatialIndex(vessels: Vessel[]): void {
    if (vessels.length === 0) {
      this.spatialIndex = null;
      return;
    }

    // Calculate bounding box
    let minLat = vessels[0].position.latitude;
    let maxLat = vessels[0].position.latitude;
    let minLon = vessels[0].position.longitude;
    let maxLon = vessels[0].position.longitude;

    for (const vessel of vessels) {
      minLat = Math.min(minLat, vessel.position.latitude);
      maxLat = Math.max(maxLat, vessel.position.latitude);
      minLon = Math.min(minLon, vessel.position.longitude);
      maxLon = Math.max(maxLon, vessel.position.longitude);
    }

    // Add padding to bounding box
    const padding = 0.1; // degrees
    this.spatialIndex = new QuadTreeImpl(
      {
        north: maxLat + padding,
        south: minLat - padding,
        east: maxLon + padding,
        west: minLon - padding
      },
      10 // capacity
    );

    // Insert vessels into spatial index
    for (const vessel of vessels) {
      this.spatialIndex?.insert(vessel.mmsi.toString(), vessel.position);
    }
  }

  /**
   * Detect potential collisions between vessels
   */
  private async detectPotentialCollisions(vessels: Vessel[]): Promise<CollisionAlert[]> {
    const newAlerts: CollisionAlert[] = [];
    const processedPairs = new Set<string>();

    for (const vessel1 of vessels) {
      const nearbyVessels = await this.getNearbyVessels(vessel1);
      
      for (const vessel2 of nearbyVessels) {
        if (vessel1.mmsi === vessel2.mmsi) continue;
        
        const pairKey = [vessel1.mmsi, vessel2.mmsi].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const proximity = this.calculateProximity(vessel1, vessel2);
        if (proximity.distance <= this.config.safetyZoneRadius) {
          const alert = this.createCollisionAlert(vessel1, vessel2, proximity);
          this.alerts.set(alert.id, alert);
          newAlerts.push(alert);
        }
      }
    }

    return newAlerts;
  }

  /**
   * Get vessels within safety zone radius using spatial index
   */
  private async getNearbyVessels(vessel: Vessel): Promise<Vessel[]> {
    if (!this.spatialIndex) return [];

    const bounds = this.createBoundingBox(vessel.position, this.config.safetyZoneRadius);
    const nearbyIds = this.spatialIndex?.query(bounds) || [];
    
    const vessels: Vessel[] = [];
    for (const id of nearbyIds) {
      const vessel = await vesselStore.getVessel(parseInt(id, 10));
      if (vessel) {
        vessels.push(vessel);
      }
    }
    
    return vessels;
  }

  /**
   * Calculate proximity between two vessels
   */
  private calculateProximity(vessel1: Vessel, vessel2: Vessel): VesselProximity {
    const distance = this.calculateDistance(vessel1.position, vessel2.position);
    const bearing = this.calculateBearing(vessel1.position, vessel2.position);
    
    // Calculate relative course and speed
    const relativeCourse = this.calculateRelativeCourse(vessel1, vessel2);
    const relativeSpeed = this.calculateRelativeSpeed(vessel1, vessel2);
    
    // Calculate CPA and TCPA
    const cpa = this.calculateCPA(vessel1, vessel2);
    const tcpa = this.calculateTCPA(vessel1, vessel2, cpa);

    return {
      vessel1Id: vessel1.mmsi.toString(),
      vessel2Id: vessel2.mmsi.toString(),
      distance,
      cpa,
      tcpa,
      bearing,
      relativeCourse,
      relativeSpeed
    };
  }

  /**
   * Calculate distance between two points in nautical miles
   */
  private calculateDistance(point1: Point, point2: Point): number {
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
  private calculateBearing(point1: Point, point2: Point): number {
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
   * Calculate relative course between two vessels
   */
  private calculateRelativeCourse(vessel1: Vessel, vessel2: Vessel): number {
    if (vessel1.course === undefined || vessel2.course === undefined) {
      return 0;
    }
    
    let relative = vessel2.course - vessel1.course;
    if (relative < 0) relative += 360;
    if (relative >= 360) relative -= 360;
    
    return relative;
  }

  /**
   * Calculate relative speed between two vessels
   */
  private calculateRelativeSpeed(vessel1: Vessel, vessel2: Vessel): number {
    if (vessel1.speed === undefined || vessel2.speed === undefined) {
      return 0;
    }
    
    // Simple vector difference (more complex calculation would consider course)
    return Math.abs(vessel2.speed - vessel1.speed);
  }

  /**
   * Calculate Closest Point of Approach (CPA)
   */
  private calculateCPA(vessel1: Vessel, vessel2: Vessel): number {
    if (vessel1.course === undefined || vessel1.speed === undefined ||
        vessel2.course === undefined || vessel2.speed === undefined) {
      return this.calculateDistance(vessel1.position, vessel2.position);
    }

    // Simplified CPA calculation
    // In production, you'd use full vector mathematics
    const timeToCPA = this.calculateTCPA(vessel1, vessel2, 0);
    
    if (timeToCPA <= 0) {
      return this.calculateDistance(vessel1.position, vessel2.position);
    }

    const futurePos1 = this.predictPosition(vessel1, timeToCPA);
    const futurePos2 = this.predictPosition(vessel2, timeToCPA);
    
    return this.calculateDistance(futurePos1, futurePos2);
  }

  /**
   * Calculate Time to Closest Point of Approach (TCPA) in minutes
   */
  private calculateTCPA(vessel1: Vessel, vessel2: Vessel, cpa: number): number {
    if (vessel1.course === undefined || vessel1.speed === undefined ||
        vessel2.course === undefined || vessel2.speed === undefined) {
      return -1;
    }

    // Simplified TCPA calculation
    const relativeSpeed = this.calculateRelativeSpeed(vessel1, vessel2);
    const currentDistance = this.calculateDistance(vessel1.position, vessel2.position);
    
    if (relativeSpeed < 0.1) {
      return -1; // Vessels are nearly stationary relative to each other
    }

    // Estimate time to CPA
    const timeToCPA = (currentDistance - cpa) / relativeSpeed * 60; // Convert to minutes
    
    return Math.max(0, Math.min(timeToCPA, this.config.maxPredictionTime));
  }

  /**
   * Predict vessel position after specified time in minutes
   */
  private predictPosition(vessel: Vessel, timeMinutes: number): Point {
    if (vessel.course === undefined || vessel.speed === undefined) {
      return vessel.position;
    }

    const distance = vessel.speed * (timeMinutes / 60); // nautical miles
    const bearing = this.toRadians(vessel.course);
    
    const R = 3440.065; // Earth's radius in nautical miles
    const lat1 = this.toRadians(vessel.position.latitude);
    const lon1 = this.toRadians(vessel.position.longitude);
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing)
    );
    
    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return {
      latitude: this.toDegrees(lat2),
      longitude: this.toDegrees(lon2)
    };
  }

  /**
   * Create collision alert based on proximity
   */
  private createCollisionAlert(vessel1: Vessel, vessel2: Vessel, proximity: VesselProximity): CollisionAlert {
    const level = this.determineAlertLevel(proximity);
    const alertId = `${vessel1.mmsi}-${vessel2.mmsi}-${Date.now()}`;
    
    const predictedCollisionPoint = proximity.tcpa && proximity.tcpa > 0 && proximity.tcpa < this.config.maxPredictionTime
      ? this.predictCollisionPoint(vessel1, vessel2, proximity.tcpa)
      : undefined;

    const predictedCollisionTime = proximity.tcpa && proximity.tcpa > 0 && proximity.tcpa < this.config.maxPredictionTime
      ? new Date(Date.now() + proximity.tcpa * 60 * 1000)
      : undefined;

    return {
      id: alertId,
      vessels: [vessel1.mmsi.toString(), vessel2.mmsi.toString()],
      proximity,
      level,
      timestamp: new Date(),
      resolved: false,
      predictedCollisionPoint,
      predictedCollisionTime
    };
  }

  /**
   * Determine alert level based on proximity and TCPA
   */
  private determineAlertLevel(proximity: VesselProximity): AlertLevel {
    const { distance, tcpa } = proximity;
    
    if (distance <= this.config.criticalThreshold &&
        tcpa && tcpa >= 0 && tcpa <= this.config.tcpaCriticalThreshold) {
      return AlertLevel.CRITICAL;
    }
    
    if (distance <= this.config.dangerThreshold &&
        tcpa && tcpa >= 0 && tcpa <= this.config.tcpaDangerThreshold) {
      return AlertLevel.DANGER;
    }
    
    if (distance <= this.config.warningThreshold &&
        tcpa && tcpa >= 0 && tcpa <= this.config.tcpaWarningThreshold) {
      return AlertLevel.WARNING;
    }
    
    return AlertLevel.INFO;
  }

  /**
   * Predict collision point between two vessels
   */
  private predictCollisionPoint(vessel1: Vessel, vessel2: Vessel, tcpa: number): Point {
    const pos1 = this.predictPosition(vessel1, tcpa);
    const pos2 = this.predictPosition(vessel2, tcpa);
    
    // Return midpoint as approximate collision point
    return {
      latitude: (pos1.latitude + pos2.latitude) / 2,
      longitude: (pos1.longitude + pos2.longitude) / 2
    };
  }

  /**
   * Update existing alerts
   */
  private updateExistingAlerts(vessels: Vessel[]): void {
    const vesselIds = new Set(vessels.map(v => v.mmsi.toString()));
    
    for (const [alertId, alert] of this.alerts.entries()) {
      const [vessel1Id, vessel2Id] = alert.vessels;
      
      if (!vesselIds.has(vessel1Id) || !vesselIds.has(vessel2Id)) {
        // One or both vessels are no longer active
        alert.resolved = true;
        alert.resolvedAt = new Date();
        continue;
      }
      
      const vessel1 = vessels.find(v => v.mmsi.toString() === vessel1Id);
      const vessel2 = vessels.find(v => v.mmsi.toString() === vessel2Id);
      
      if (vessel1 && vessel2) {
        // Recalculate proximity
        const proximity = this.calculateProximity(vessel1, vessel2);
        alert.proximity = proximity;
        alert.level = this.determineAlertLevel(proximity);
      }
    }
  }

  /**
   * Resolve old alerts
   */
  private resolveOldAlerts(): void {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (now - alert.timestamp.getTime() > maxAge) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
      }
    }
  }

  /**
   * Get all active alerts
   */
  public getActiveAlerts(): CollisionAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): CollisionAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Clear resolved alerts older than specified time
   */
  public clearResolvedAlerts(maxAgeMinutes: number = 60): number {
    const maxAge = maxAgeMinutes * 60 * 1000;
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && 
          now - alert.resolvedAt.getTime() > maxAge) {
        this.alerts.delete(alertId);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * Create bounding box around a point
   */
  private createBoundingBox(center: Point, radiusNauticalMiles: number): BoundingBox {
    const degreesPerNM = 1 / 60; // Approximate
    const padding = radiusNauticalMiles * degreesPerNM;
    
    return {
      north: center.latitude + padding,
      south: center.latitude - padding,
      east: center.longitude + padding,
      west: center.longitude - padding
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
}

// QuadTree implementation for spatial indexing
class QuadTreeImpl implements QuadTree {
  public bounds: BoundingBox;
  public vessels: string[] = [];
  public capacity: number;
  public divided: boolean = false;
  public northeast?: QuadTree;
  public northwest?: QuadTree;
  public southeast?: QuadTree;
  public southwest?: QuadTree;
  public depth: number;

  constructor(bounds: BoundingBox, capacity: number, depth: number = 0) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.depth = depth;
  }

  insert(vesselId: string, position: Point): boolean {
    if (!this.contains(position)) {
      return false;
    }

    if (this.vessels.length < this.capacity) {
      this.vessels.push(vesselId);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return this.northeast!.insert(vesselId, position) ||
           this.northwest!.insert(vesselId, position) ||
           this.southeast!.insert(vesselId, position) ||
           this.southwest!.insert(vesselId, position);
  }

  query(bounds: BoundingBox): string[] {
    const found: string[] = [];
    
    if (!this.intersects(bounds)) {
      return found;
    }

    for (const vesselId of this.vessels) {
      found.push(vesselId);
    }

    if (this.divided) {
      found.push(...this.northeast!.query(bounds));
      found.push(...this.northwest!.query(bounds));
      found.push(...this.southeast!.query(bounds));
      found.push(...this.southwest!.query(bounds));
    }

    return found;
  }

  private contains(position: Point): boolean {
    return position.latitude >= this.bounds.south &&
           position.latitude <= this.bounds.north &&
           position.longitude >= this.bounds.west &&
           position.longitude <= this.bounds.east;
  }

  private intersects(bounds: BoundingBox): boolean {
    return !(bounds.west > this.bounds.east ||
             bounds.east < this.bounds.west ||
             bounds.north < this.bounds.south ||
             bounds.south > this.bounds.north);
  }

  private subdivide(): void {
    const x = this.bounds.west;
    const y = this.bounds.south;
    const w = (this.bounds.east - this.bounds.west) / 2;
    const h = (this.bounds.north - this.bounds.south) / 2;

    const ne = { north: y + h, south: y, east: x + w, west: x };
    const nw = { north: y + h, south: y, east: x + 2 * w, west: x + w };
    const se = { north: y + 2 * h, south: y + h, east: x + w, west: x };
    const sw = { north: y + 2 * h, south: y + h, east: x + 2 * w, west: x + w };

    this.northeast = new QuadTreeImpl(ne, this.capacity, this.depth + 1);
    this.northwest = new QuadTreeImpl(nw, this.capacity, this.depth + 1);
    this.southeast = new QuadTreeImpl(se, this.capacity, this.depth + 1);
    this.southwest = new QuadTreeImpl(sw, this.capacity, this.depth + 1);

    this.divided = true;
  }
}

export const collisionDetection = new CollisionDetection();