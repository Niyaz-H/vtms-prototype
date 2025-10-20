/**
 * Collision Detection Types and Interfaces
 */

export interface Point {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SafetyZone {
  center: Point;
  radius: number; // in nautical miles
  type: 'static' | 'dynamic';
  id?: string;
  name?: string;
}

export interface VesselProximity {
  vessel1Id: string;
  vessel2Id: string;
  distance: number; // in nautical miles
  cpa?: number; // Closest Point of Approach (nautical miles)
  tcpa?: number; // Time to CPA (minutes)
  bearing?: number; // Bearing from vessel1 to vessel2 (degrees)
  relativeCourse?: number; // Relative course between vessels (degrees)
  relativeSpeed?: number; // Relative speed (knots)
}

export interface CollisionAlert {
  id: string;
  vessels: [string, string]; // MMSI of both vessels
  proximity: VesselProximity;
  level: AlertLevel;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  predictedCollisionPoint?: Point;
  predictedCollisionTime?: Date;
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  CRITICAL = 'critical'
}

export interface CollisionDetectionConfig {
  safetyZoneRadius: number; // Default safety zone radius (nautical miles)
  warningThreshold: number; // Distance threshold for warnings (nautical miles)
  dangerThreshold: number; // Distance threshold for danger alerts (nautical miles)
  criticalThreshold: number; // Distance threshold for critical alerts (nautical miles)
  tcpaWarningThreshold: number; // TCPA threshold for warnings (minutes)
  tcpaDangerThreshold: number; // TCPA threshold for danger (minutes)
  tcpaCriticalThreshold: number; // TCPA threshold for critical (minutes)
  minSpeed: number; // Minimum vessel speed to consider for collision detection (knots)
  maxPredictionTime: number; // Maximum prediction time (minutes)
  updateInterval: number; // Collision detection update interval (seconds)
}

export interface CollisionDetectionResult {
  alerts: CollisionAlert[];
  processedVessels: number;
  processingTime: number; // in milliseconds
  timestamp: Date;
}

// Spatial Indexing Types
export interface SpatialIndexNode {
  bounds: BoundingBox;
  vessels: string[]; // Vessel IDs
  children?: SpatialIndexNode[];
  depth: number;
}

export interface QuadTree extends SpatialIndexNode {
  capacity: number;
  divided: boolean;
  northeast?: QuadTree;
  northwest?: QuadTree;
  southeast?: QuadTree;
  southwest?: QuadTree;
  insert(vesselId: string, position: Point): boolean;
  query(bounds: BoundingBox): string[];
}

export interface CollisionDetectionStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsByLevel: Record<AlertLevel, number>;
  averageProcessingTime: number;
  lastUpdate: Date;
  vesselsTracked: number;
}