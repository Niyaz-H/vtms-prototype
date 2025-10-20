/**
 * API Routes
 * Defines all REST API endpoints for the VTMS system
 */

import { Express, Request, Response, NextFunction } from 'express';
import { vesselStore } from '../services/vesselStore';
import { collisionDetection } from '../services/collisionDetection';
import { aisSimulationService } from '../services/aisSimulation';
import { VesselQuery, ApiResponse, PaginatedResponse, CollisionAlertQuery } from '../types';

/**
 * Setup all API routes
 */
export function setupRoutes(app: Express): void {
  // Vessel routes
  app.get('/api/vessels', getVessels);
  app.get('/api/vessels/:mmsi', getVessel);
  app.get('/api/vessels/:mmsi/history', getVesselHistory);
  
  // Collision alert routes
  app.get('/api/alerts', getAlerts);
  app.get('/api/alerts/:id', getAlert);
  app.put('/api/alerts/:id/resolve', resolveAlert);
  
  // System routes
  app.get('/api/stats', getSystemStats);
  app.get('/api/health', getHealth);
  
  // Simulation routes
  app.post('/api/simulation/start', startSimulation);
  app.post('/api/simulation/stop', stopSimulation);
  app.get('/api/simulation/status', getSimulationStatus);
  app.post('/api/simulation/vessels', addSimulationVessel);
  app.delete('/api/simulation/vessels/:mmsi', removeSimulationVessel);
}

/**
 * GET /api/vessels
 * Get vessels with optional filtering
 */
async function getVessels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: VesselQuery = {
      boundingBox: req.query.boundingBox ? JSON.parse(req.query.boundingBox as string) : undefined,
      vesselTypes: req.query.vesselTypes ? (req.query.vesselTypes as string).split(',').map(Number) : undefined,
      speedRange: req.query.speedRange ? JSON.parse(req.query.speedRange as string) : undefined,
      status: req.query.status ? (req.query.status as string).split(',').map(Number) : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };

    const vessels = await vesselStore.queryVessels(query);
    
    const response: ApiResponse<typeof vessels> = {
      success: true,
      data: vessels,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vessels/:mmsi
 * Get a specific vessel by MMSI
 */
async function getVessel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mmsi = parseInt(req.params.mmsi, 10);
    
    if (isNaN(mmsi)) {
      res.status(400).json({
        success: false,
        error: 'Invalid MMSI',
        timestamp: new Date()
      });
      return;
    }

    const vessel = await vesselStore.getVessel(mmsi);
    
    if (!vessel) {
      res.status(404).json({
        success: false,
        error: 'Vessel not found',
        timestamp: new Date()
      });
      return;
    }

    const response: ApiResponse<typeof vessel> = {
      success: true,
      data: vessel,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vessels/:mmsi/history
 * Get vessel history
 */
async function getVesselHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mmsi = parseInt(req.params.mmsi, 10);
    
    if (isNaN(mmsi)) {
      res.status(400).json({
        success: false,
        error: 'Invalid MMSI',
        timestamp: new Date()
      });
      return;
    }

    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : new Date();

    const history = await vesselStore.getVesselHistory(mmsi, startTime, endTime);
    
    const response: ApiResponse<typeof history> = {
      success: true,
      data: history,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts
 * Get collision alerts with optional filtering
 */
async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: CollisionAlertQuery = {
      level: req.query.level ? (req.query.level as string).split(',') as any[] : undefined,
      active: req.query.active ? req.query.active === 'true' : undefined,
      vesselIds: req.query.vesselIds ? (req.query.vesselIds as string).split(',') : undefined,
      boundingBox: req.query.boundingBox ? JSON.parse(req.query.boundingBox as string) : undefined,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };

    let alerts = collisionDetection.getAllAlerts();
    
    // Apply filters
    if (query.active !== undefined) {
      alerts = alerts.filter(alert => !alert.resolved === query.active);
    }
    
    if (query.level && query.level.length > 0) {
      alerts = alerts.filter(alert => query.level!.includes(alert.level));
    }
    
    if (query.vesselIds && query.vesselIds.length > 0) {
      alerts = alerts.filter(alert => 
        query.vesselIds!.some(vesselId => alert.vessels.includes(vesselId))
      );
    }
    
    if (query.startTime) {
      alerts = alerts.filter(alert => alert.timestamp >= query.startTime!);
    }
    
    if (query.endTime) {
      alerts = alerts.filter(alert => alert.timestamp <= query.endTime!);
    }
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedAlerts = alerts.slice(offset, offset + limit);
    
    const response: ApiResponse<typeof paginatedAlerts> = {
      success: true,
      data: paginatedAlerts,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts/:id
 * Get a specific collision alert
 */
async function getAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alertId = req.params.id;
    const alert = collisionDetection.getAllAlerts().find(a => a.id === alertId);
    
    if (!alert) {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date()
      });
      return;
    }

    const response: ApiResponse<typeof alert> = {
      success: true,
      data: alert,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/alerts/:id/resolve
 * Mark a collision alert as resolved
 */
async function resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alertId = req.params.id;
    const alerts = collisionDetection.getAllAlerts();
    const alert = alerts.find(a => a.id === alertId);
    
    if (!alert) {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date()
      });
      return;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    const response: ApiResponse<typeof alert> = {
      success: true,
      data: alert,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stats
 * Get system statistics
 */
async function getSystemStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vesselCount = await vesselStore.getVesselCount();
    const allAlerts = collisionDetection.getAllAlerts();
    const activeAlerts = collisionDetection.getActiveAlerts();
    const simulationStatus = aisSimulationService.getStatus();
    
    const stats = {
      vessels: {
        total: vesselCount,
        active: vesselCount,
        updatedLastHour: vesselCount,
        updatedLast24Hours: vesselCount
      },
      alerts: {
        total: allAlerts.length,
        active: activeAlerts.length,
        byLevel: getAlertsByLevel(allAlerts)
      },
      system: {
        uptime: process.uptime(),
        messagesProcessed: 0,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0,
        nodeVersion: process.version
      },
      simulation: simulationStatus,
      timestamp: new Date()
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/health
 * Health check endpoint
 */
async function getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dbHealth = await vesselStore.healthCheck();
    
    const health = {
      status: (dbHealth.redis && dbHealth.postgres) ? 'healthy' : 'degraded',
      timestamp: new Date(),
      services: {
        database: {
          status: dbHealth.postgres ? 'healthy' : 'unhealthy',
          lastCheck: new Date()
        },
        redis: {
          status: dbHealth.redis ? 'healthy' : 'unhealthy',
          lastCheck: new Date()
        },
        websocket: {
          status: 'healthy',
          lastCheck: new Date()
        }
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    const response: ApiResponse<typeof health> = {
      success: health.status === 'healthy',
      data: health,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/simulation/start
 * Start AIS simulation
 */
async function startSimulation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await aisSimulationService.start();
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'AIS simulation started' },
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/simulation/stop
 * Stop AIS simulation
 */
async function stopSimulation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await aisSimulationService.stop();
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'AIS simulation stopped' },
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/simulation/status
 * Get simulation status
 */
async function getSimulationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = aisSimulationService.getStatus();
    
    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/simulation/vessels
 * Add a vessel to simulation
 */
async function addSimulationVessel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vesselData = req.body;
    aisSimulationService.addVessel(vesselData);
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Vessel added to simulation' },
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/simulation/vessels/:mmsi
 * Remove a vessel from simulation
 */
async function removeSimulationVessel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mmsi = parseInt(req.params.mmsi, 10);
    
    if (isNaN(mmsi)) {
      res.status(400).json({
        success: false,
        error: 'Invalid MMSI',
        timestamp: new Date()
      });
      return;
    }

    const removed = aisSimulationService.removeVessel(mmsi);
    
    if (!removed) {
      res.status(404).json({
        success: false,
        error: 'Vessel not found in simulation',
        timestamp: new Date()
      });
      return;
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Vessel removed from simulation' },
      timestamp: new Date(),
      requestId: generateRequestId()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get alerts grouped by level
 */
function getAlertsByLevel(alerts: any[]): Record<string, number> {
  const byLevel: Record<string, number> = {
    info: 0,
    warning: 0,
    danger: 0,
    critical: 0
  };
  
  alerts.forEach(alert => {
    if (byLevel.hasOwnProperty(alert.level)) {
      byLevel[alert.level]++;
    }
  });
  
  return byLevel;
}