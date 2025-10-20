/**
 * API Request and Response Types
 */

import { Vessel } from './ais';
import { CollisionAlert, AlertLevel } from './collision';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
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

export interface VesselQuery {
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  vesselTypes?: number[];
  speedRange?: {
    min?: number;
    max?: number;
  };
  status?: number[];
  search?: string; // Search by name or MMSI
  limit?: number;
  offset?: number;
}

export interface VesselResponse extends Vessel {
  alerts?: CollisionAlert[];
  age?: number; // Age of last position update in seconds
}

export interface CollisionAlertQuery {
  level?: AlertLevel[];
  active?: boolean;
  vesselIds?: string[];
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

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
    uptime: number; // in seconds
    messagesProcessed: number;
    lastMessageTime?: Date;
    memoryUsage: number; // in MB
    cpuUsage: number; // in percentage
  };
  performance: {
    averageProcessingTime: number; // in milliseconds
    messagesPerSecond: number;
    websocketConnections: number;
  };
}

export interface WebSocketMessage {
  type: 'vessel_update' | 'collision_alert' | 'system_stats' | 'error';
  data: any;
  timestamp: Date;
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

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
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
  responseTime?: number; // in milliseconds
  error?: string;
  lastCheck: Date;
}

// Configuration Types
export interface VTMSConfig {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  ais: {
    enabled: boolean;
    simulationMode: boolean;
    updateInterval: number; // milliseconds
  };
  collisionDetection: {
    enabled: boolean;
    updateInterval: number; // seconds
    safetyZoneRadius: number; // nautical miles
  };
  websocket: {
    enabled: boolean;
    path: string;
    cors: {
      origin: string[];
    };
  };
}