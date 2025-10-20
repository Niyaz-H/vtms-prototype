// Alert Levels
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  CRITICAL = 'critical'
}

// Vessel Proximity
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

// Collision Alert
export interface CollisionAlert {
  id: string;
  vessels: [string, string]; // MMSI of both vessels
  proximity: VesselProximity;
  level: AlertLevel;
  timestamp: string; // ISO string
  resolved: boolean;
  resolvedAt?: string; // ISO string
  predictedCollisionPoint?: {
    latitude: number;
    longitude: number;
  };
  predictedCollisionTime?: string; // ISO string
}

// Alert UI Extensions
export interface CollisionAlertUI extends Omit<CollisionAlert, 'vessels'> {
  vessels: [string, string]; // MMSI of both vessels
  selected?: boolean;
  visible?: boolean;
  expanded?: boolean;
  vesselDetails?: {
    vessel1: Vessel;
    vessel2: Vessel;
  };
}

// Alert Filters
export interface AlertFilters {
  levels?: AlertLevel[];
  active?: boolean;
  vesselIds?: string[];
  area?: BoundingBox;
  startTime?: string;
  endTime?: string;
  search?: string;
}

// Alert Statistics
export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  byLevel: Record<AlertLevel, number>;
  byTimeRange: {
    lastHour: number;
    last24Hours: number;
    lastWeek: number;
  };
  averageResolutionTime: number; // in minutes
}

// Alert History
export interface AlertHistory {
  alert: CollisionAlert;
  timeline: Array<{
    timestamp: string;
    action: 'created' | 'updated' | 'resolved';
    details?: string;
  }>;
}

// Alert Notification
export interface AlertNotification {
  id: string;
  type: 'collision_alert' | 'system_alert';
  title: string;
  message: string;
  level: AlertLevel;
  timestamp: string;
  read: boolean;
  data?: any;
}

// Alert Settings
export interface AlertSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  levels: {
    [AlertLevel.INFO]: boolean;
    [AlertLevel.WARNING]: boolean;
    [AlertLevel.DANGER]: boolean;
    [AlertLevel.CRITICAL]: boolean;
  };
  thresholds: {
    warningDistance: number; // nautical miles
    dangerDistance: number; // nautical miles
    criticalDistance: number; // nautical miles
    warningTcpa: number; // minutes
    dangerTcpa: number; // minutes
    criticalTcpa: number; // minutes
  };
}

// Import other types
import type { Vessel } from './vessel';
import type { BoundingBox } from './api';