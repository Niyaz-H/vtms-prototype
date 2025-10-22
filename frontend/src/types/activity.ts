/**
 * Suspicious Activity Detection Types (Frontend)
 */

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

export interface Point {
  latitude: number;
  longitude: number;
}

export interface ActivityEvent {
  timestamp: string;
  type: string;
  description: string;
  data?: Record<string, any>;
}

export interface SuspiciousActivity {
  id: string;
  type: ActivityType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vessels: string[]; // MMSIs
  detectedAt: string;
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
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  escalatedAt?: string;
  escalatedTo?: string;
}

export interface RendezvousEvent {
  id: string;
  vessel1: string;
  vessel2: string;
  startTime: string;
  endTime?: string;
  meetingLocation: Point;
  approachDistance: number;
  duration: number;
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
  startTime: string;
  endTime?: string;
  location: Point;
  duration: number;
  radius: number;
  averageSpeed: number;
  maxSpeed: number;
  inAnchorageArea: boolean;
  vesselType?: number;
}

export interface ActivityStats {
  isRunning: boolean;
  alerts: {
    total: number;
    pending: number;
    byState: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  rendezvous: {
    active: number;
    completed: number;
  };
  loitering: {
    activeLoitering: number;
    completedLoitering: number;
    vesselsTracked: number;
  };
  lastUpdate: string;
}

// Helper functions
export const getActivityTypeLabel = (type: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    [ActivityType.COLLISION_RISK]: 'Collision Risk',
    [ActivityType.SUSPICIOUS_RENDEZVOUS]: 'Suspicious Meeting',
    [ActivityType.LOITERING]: 'Loitering',
    [ActivityType.AIS_MANIPULATION]: 'AIS Manipulation',
    [ActivityType.ZONE_VIOLATION]: 'Zone Violation',
    [ActivityType.DARK_VESSEL]: 'Dark Vessel',
    [ActivityType.SPEED_ANOMALY]: 'Speed Anomaly',
    [ActivityType.COURSE_DEVIATION]: 'Course Deviation'
  };
  return labels[type];
};

export const getActivityTypeIcon = (type: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    [ActivityType.COLLISION_RISK]: '⚠️',
    [ActivityType.SUSPICIOUS_RENDEZVOUS]: '🤝',
    [ActivityType.LOITERING]: '⏸️',
    [ActivityType.AIS_MANIPULATION]: '📡',
    [ActivityType.ZONE_VIOLATION]: '🚫',
    [ActivityType.DARK_VESSEL]: '🌑',
    [ActivityType.SPEED_ANOMALY]: '⚡',
    [ActivityType.COURSE_DEVIATION]: '🧭'
  };
  return icons[type];
};

export const getAlertStateLabel = (state: AlertState): string => {
  const labels: Record<AlertState, string> = {
    [AlertState.NEW]: 'New',
    [AlertState.ACKNOWLEDGED]: 'Acknowledged',
    [AlertState.INVESTIGATING]: 'Investigating',
    [AlertState.RESOLVED]: 'Resolved',
    [AlertState.FALSE_POSITIVE]: 'False Positive',
    [AlertState.ESCALATED]: 'Escalated'
  };
  return labels[state];
};

export const getAlertStateColor = (state: AlertState): string => {
  const colors: Record<AlertState, string> = {
    [AlertState.NEW]: 'bg-red-100 text-red-800 border-red-200',
    [AlertState.ACKNOWLEDGED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [AlertState.INVESTIGATING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [AlertState.RESOLVED]: 'bg-green-100 text-green-800 border-green-200',
    [AlertState.FALSE_POSITIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
    [AlertState.ESCALATED]: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return colors[state];
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
};