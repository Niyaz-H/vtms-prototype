// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Vessel Query Types
export interface VesselQuery {
  boundingBox?: BoundingBox;
  vesselTypes?: number[];
  speedRange?: {
    min?: number;
    max?: number;
  };
  status?: number[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Alert Query Types
export interface AlertQuery {
  level?: AlertLevel[];
  active?: boolean;
  vesselIds?: string[];
  boundingBox?: BoundingBox;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

// System Stats Types
export interface SystemStats {
  vessels: {
    total: number;
    active: number;
    updatedLastHour: number;
    updatedLast24Hours: number;
  };
  alerts: {
    total: number;
    active: number;
    byLevel: Record<AlertLevel, number>;
  };
  system: {
    uptime: number;
    messagesProcessed: number;
    lastMessageTime?: string;
    memoryUsage: number;
    cpuUsage: number;
    nodeVersion: string;
  };
  simulation: {
    running: boolean;
    vesselCount: number;
  };
  timestamp: string;
}

// Simulation Control Types
export interface SimulationStatus {
  running: boolean;
  vesselCount: number;
}

export interface SimulationVessel {
  mmsi?: number;
  name?: string;
  vesselType?: number;
  position?: {
    latitude: number;
    longitude: number;
  };
  course?: number;
  speed?: number;
  heading?: number;
  status?: number;
  destination?: string;
  dimension?: {
    length: number;
    width: number;
  };
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    websocket: ServiceHealth;
  };
  version: string;
  uptime: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'vessel_update' | 'collision_alert' | 'system_stats' | 'error';
  data: any;
  timestamp: string;
}

export interface VesselUpdateMessage extends WebSocketMessage {
  type: 'vessel_update';
  data: {
    vessel: Vessel;
    updateType: 'position' | 'static' | 'full';
  };
}

export interface CollisionAlertMessage extends WebSocketMessage {
  type: 'collision_alert';
  data: {
    alert: CollisionAlert;
    action: 'created' | 'updated' | 'resolved';
  };
}

export interface SystemStatsMessage extends WebSocketMessage {
  type: 'system_stats';
  data: SystemStats;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

// Import vessel and alert types
import type { Vessel } from './vessel';
import type { CollisionAlert, AlertLevel } from './alert';