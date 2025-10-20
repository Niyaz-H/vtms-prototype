/**
 * VTMS Configuration
 */

import { VTMSConfig } from '../types';

const config: VTMSConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'vtms',
    username: process.env.DB_USER || 'vtms_user',
    password: process.env.DB_PASSWORD || 'vtms_password',
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  ais: {
    enabled: process.env.AIS_ENABLED !== 'false',
    simulationMode: process.env.AIS_SIMULATION_MODE !== 'false',
    updateInterval: parseInt(process.env.AIS_UPDATE_INTERVAL || '5000', 10),
  },
  collisionDetection: {
    enabled: process.env.COLLISION_DETECTION_ENABLED !== 'false',
    updateInterval: parseInt(process.env.COLLISION_DETECTION_INTERVAL || '5', 10),
    safetyZoneRadius: parseFloat(process.env.SAFETY_ZONE_RADIUS || '0.5'), // nautical miles
  },
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    path: '/socket.io',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },
  },
};

export default config;

// Environment validation
export function validateConfig(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Using default values for development. Please set these variables in production.');
  }
}

// Configuration for collision detection
export const collisionDetectionConfig = {
  safetyZoneRadius: config.collisionDetection.safetyZoneRadius,
  warningThreshold: 2.0, // nautical miles
  dangerThreshold: 1.0, // nautical miles
  criticalThreshold: 0.5, // nautical miles
  tcpaWarningThreshold: 15, // minutes
  tcpaDangerThreshold: 10, // minutes
  tcpaCriticalThreshold: 5, // minutes
  minSpeed: 0.5, // knots
  maxPredictionTime: 30, // minutes
  updateInterval: config.collisionDetection.updateInterval,
};

// AIS simulation configuration
export const aisSimulationConfig = {
  vesselCount: parseInt(process.env.AIS_SIMULATION_VESSELS || '100', 10),
  areaBounds: {
    north: parseFloat(process.env.AIS_SIMULATION_NORTH || '60.0'),
    south: parseFloat(process.env.AIS_SIMULATION_SOUTH || '50.0'),
    east: parseFloat(process.env.AIS_SIMULATION_EAST || '30.0'),
    west: parseFloat(process.env.AIS_SIMULATION_WEST || '10.0'),
  },
  speedRange: {
    min: parseFloat(process.env.AIS_SIMULATION_SPEED_MIN || '5.0'),
    max: parseFloat(process.env.AIS_SIMULATION_SPEED_MAX || '25.0'),
  },
  updateInterval: config.ais.updateInterval,
};