/**
 * VTMS Server Main Entry Point
 */

import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import config from './config';
import { aisSimulationService } from './services/aisSimulation';
import { vesselStore } from './services/vesselStore';
import { collisionDetection } from './services/collisionDetection';
import { activityDetection } from './services/activityDetection';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './services/websocket';

class VTMServer {
  private app: Express;
  private server: any;
  private io: SocketIOServer;
  private collisionDetectionInterval: NodeJS.Timeout | null = null;
  private activityDetectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: config.websocket.path,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors(config.server.cors));
    
    // Compression middleware
    this.app.use(compression());
    
    // Logging middleware
    this.app.use(morgan('combined'));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    setupRoutes(this.app);
  }

  private setupSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'VTMS API',
          version: '1.0.0',
          description: 'Vessel Traffic Management System API',
          contact: {
            name: 'Niyaz Huseyn-zada',
            email: 'niyaz@example.com'
          }
        },
        servers: [
          {
            url: `http://localhost:${config.server.port}`,
            description: 'Development server'
          }
        ]
      },
      apis: ['./src/routes/*.ts', './src/types/*.ts']
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private setupSocketIO(): void {
    setupSocketHandlers(this.io);
  }

  public async start(): Promise<void> {
    try {
      // Test database connections
      const health = await vesselStore.healthCheck();
      if (!health.redis) {
        console.warn('Redis connection failed - some features may not work');
      }
      if (!health.postgres) {
        console.warn('PostgreSQL connection failed - persistence disabled');
      }

      // Start AIS simulation if enabled
      if (config.ais.simulationMode) {
        await aisSimulationService.start();
        console.log('AIS simulation started');
      }

      // Start collision detection
      this.startCollisionDetection();

      // Start activity detection
      this.startActivityDetection();

      // Start the server
      this.server.listen(config.server.port, config.server.host, () => {
        console.log(`VTMS Server running on http://${config.server.host}:${config.server.port}`);
        console.log(`API Documentation: http://${config.server.host}:${config.server.port}/api-docs`);
        console.log(`WebSocket endpoint: ws://${config.server.host}:${config.server.port}${config.websocket.path}`);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private startCollisionDetection(): void {
    if (!config.collisionDetection.enabled) {
      console.log('Collision detection is disabled');
      return;
    }

    const intervalMs = config.collisionDetection.updateInterval * 1000;
    
    this.collisionDetectionInterval = setInterval(async () => {
      try {
        const result = await collisionDetection.detectCollisions();
        
        // Broadcast new alerts to WebSocket clients
        const activeAlerts = collisionDetection.getActiveAlerts();
        if (activeAlerts.length > 0) {
          this.io.emit('collision_alerts', {
            type: 'collision_alert',
            data: activeAlerts,
            timestamp: new Date()
          });
        }

        // Broadcast system stats
        this.io.emit('system_stats', {
          type: 'system_stats',
          data: {
            vesselsTracked: result.processedVessels,
            activeAlerts: activeAlerts.length,
            processingTime: result.processingTime,
            timestamp: result.timestamp
          }
        });

      } catch (error) {
        console.error('Collision detection error:', error);
      }
    }, intervalMs);

    console.log(`Collision detection started (interval: ${config.collisionDetection.updateInterval}s)`);
  }

  private startActivityDetection(): void {
    const intervalMs = 30 * 1000; // Run every 30 seconds
    
    this.activityDetectionInterval = setInterval(async () => {
      try {
        const result = await activityDetection.runDetection();
        
        // Broadcast suspicious activities to WebSocket clients
        const pendingActivities = activityDetection.getPendingActivities();
        if (pendingActivities.length > 0) {
          this.io.emit('suspicious_activities', {
            type: 'suspicious_activities',
            data: pendingActivities,
            timestamp: new Date()
          });
        }

        // Broadcast activity detection stats
        const stats = activityDetection.getStatistics();
        this.io.emit('activity_stats', {
          type: 'activity_stats',
          data: stats,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Activity detection error:', error);
      }
    }, intervalMs);

    console.log(`Activity detection started (interval: 30s)`);
  }

  public async stop(): Promise<void> {
    console.log('Shutting down VTMS Server...');

    // Stop collision detection
    if (this.collisionDetectionInterval) {
      clearInterval(this.collisionDetectionInterval);
    }

    // Stop activity detection
    if (this.activityDetectionInterval) {
      clearInterval(this.activityDetectionInterval);
    }

    // Stop AIS simulation
    if (config.ais.simulationMode) {
      await aisSimulationService.stop();
    }

    // Close database connections
    await vesselStore.close();

    // Close server
    this.server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await server.stop();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await server.stop();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Create and start the server
const server = new VTMServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default server;