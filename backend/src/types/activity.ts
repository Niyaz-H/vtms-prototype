/**
 * Suspicious Activity Detection Types
 */

import { Point } from './collision';

// Re-export Point for convenience
export { Point };

export enum AlertState {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated'
}

export enum ActivityType {
  COLLISION_RISK = 'collision_risk',
  SUSPICIOUS_RENDEZVOUS = 'suspicious_rendezvous',
  LOITERING = 'loitering',
  AIS_MANIPULATION = 'ais_manipulation',
  ZONE_VIOLATION = 'zone_violation',
  DARK_VESSEL = 'dark_vessel',
  SPEED_ANOMALY = 'speed_anomaly',
  COURSE_DEVIATION = 'course_deviation'
}

export interface ActivityEvent {
  timestamp: Date;
  type: string;
  description: string;
  data?: Record<string, any>;
}

export interface SuspiciousActivity {
  id: string;
  type: ActivityType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vessels: string[]; // MMSIs
  detectedAt: Date;
  location: Point;
  evidence: {
    description: string;
    metrics: Record<string, number>;
    timeline: ActivityEvent[];
  };
  state: AlertState;
  assignedTo?: string;
  notes: string[];
  attachments?: string[];
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalatedAt?: Date;
  escalatedTo?: string;
}

export interface RendezvousEvent {
  id: string;
  vessel1: string;
  vessel2: string;
  startTime: Date;
  endTime?: Date;
  meetingLocation: Point;
  approachDistance: number; // nautical miles
  duration: number; // minutes
  vessel1SpeedBefore: number;
  vessel1SpeedDuring: number;
  vessel1SpeedAfter?: number;
  vessel2SpeedBefore: number;
  vessel2SpeedDuring: number;
  vessel2SpeedAfter?: number;
  minimumDistance: number;
  inPortArea: boolean;
}

export interface LoiteringEvent {
  id: string;
  vessel: string;
  startTime: Date;
  endTime?: Date;
  location: Point;
  duration: number; // minutes
  radius: number; // area covered in NM
  averageSpeed: number;
  maxSpeed: number;
  inAnchorageArea: boolean;
  vesselType?: number;
}

export interface AISAnomalyEvent {
  id: string;
  vessel: string;
  timestamp: Date;
  anomalyType: 'position_jump' | 'impossible_speed' | 'duplicate_mmsi' | 'on_land' | 'gap';
  severity: 'low' | 'medium' | 'high';
  details: {
    description: string;
    beforePosition?: Point;
    afterPosition?: Point;
    distance?: number;
    speed?: number;
    gapDuration?: number;
  };
}

export interface VesselPair {
  vessel1: string;
  vessel2: string;
  firstEncounter: Date;
  lastUpdate: Date;
  encounters: number;
  distances: number[]; // History of distances
  locations: Point[]; // Meeting locations
}

export interface DetectionConfig {
  rendezvous: {
    proximityThreshold: number; // NM
    durationThreshold: number; // seconds
    speedThreshold: number; // knots
    minSeparationBefore: number; // NM
  };
  loitering: {
    durationThreshold: number; // seconds
    speedThreshold: number; // knots
    radiusThreshold: number; // NM
  };
  aisAnomaly: {
    maxJumpDistance: number; // NM
    maxSpeedByType: Record<number, number>; // vessel type -> max speed
    maxGapDuration: number; // minutes
  };
  speedAnomaly: {
    rapidChangeThreshold: number; // knots per minute
    maxChangeWindow: number; // minutes
  };
  courseDeviation: {
    maxDeviationAngle: number; // degrees
    minConsecutiveDeviations: number;
  };
}

export interface ActivityDetectionResult {
  activities: SuspiciousActivity[];
  rendezvousEvents: RendezvousEvent[];
  loiteringEvents: LoiteringEvent[];
  aisAnomalies: AISAnomalyEvent[];
  processedVessels: number;
  processingTime: number;
  timestamp: Date;
}