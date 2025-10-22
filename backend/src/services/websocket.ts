/**
 * WebSocket Service
 * Handles real-time communication with connected clients
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { vesselStore } from './vesselStore';
import { collisionDetection } from './collisionDetection';
import { Vessel, CollisionAlert, SystemStats, WebSocketMessage } from '../types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  subscriptions: Set<string>;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
    this.startStatsBroadcast();
  }

  /**
   * Setup main Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      authSocket.subscriptions = new Set();
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, authSocket);

      // Handle authentication
      socket.on('authenticate', (data) => {
        this.handleAuthentication(authSocket, data);
      });

      // Handle vessel subscriptions
      socket.on('subscribe_vessels', (data) => {
        this.handleVesselSubscription(authSocket, data);
      });

      socket.on('unsubscribe_vessels', (data) => {
        this.handleVesselUnsubscription(authSocket, data);
      });

      // Handle area subscriptions
      socket.on('subscribe_area', (data) => {
        this.handleAreaSubscription(authSocket, data);
      });

      socket.on('unsubscribe_area', (data) => {
        this.handleAreaUnsubscription(authSocket, data);
      });

      // Handle collision alert subscriptions
      socket.on('subscribe_alerts', (data) => {
        this.handleAlertSubscription(authSocket, data);
      });

      socket.on('unsubscribe_alerts', () => {
        this.handleAlertUnsubscription(authSocket);
      });

      // Handle vessel queries
      socket.on('get_vessels', async (data) => {
        await this.handleVesselQuery(authSocket, data);
      });

      socket.on('get_vessel', async (data) => {
        await this.handleSingleVesselQuery(authSocket, data);
      });

      socket.on('get_alerts', async (data) => {
        await this.handleAlertQuery(authSocket, data);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Send initial data
      this.sendInitialData(authSocket);
    });
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(socket: AuthenticatedSocket, data: any): void {
    // For demo purposes, accept any authentication
    // In production, implement proper JWT validation
    const { token, userId } = data;
    
    if (token && userId) {
      socket.userId = userId;
      socket.emit('authenticated', { 
        success: true, 
        userId,
        timestamp: new Date()
      });
      console.log(`Client authenticated: ${socket.id} as user ${userId}`);
    } else {
      socket.emit('authentication_error', { 
        error: 'Invalid credentials',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle vessel subscription requests
   */
  private handleVesselSubscription(socket: AuthenticatedSocket, data: any): void {
    const { vesselIds } = data;
    
    if (Array.isArray(vesselIds)) {
      vesselIds.forEach((vesselId: string) => {
        socket.subscriptions.add(`vessel:${vesselId}`);
      });
      
      socket.emit('subscribed', { 
        type: 'vessels',
        count: vesselIds.length,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle vessel unsubscription requests
   */
  private handleVesselUnsubscription(socket: AuthenticatedSocket, data: any): void {
    const { vesselIds } = data;
    
    if (Array.isArray(vesselIds)) {
      vesselIds.forEach((vesselId: string) => {
        socket.subscriptions.delete(`vessel:${vesselId}`);
      });
      
      socket.emit('unsubscribed', { 
        type: 'vessels',
        count: vesselIds.length,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle geographic area subscription
   */
  private handleAreaSubscription(socket: AuthenticatedSocket, data: any): void {
    const { bounds } = data;
    
    if (bounds && bounds.north && bounds.south && bounds.east && bounds.west) {
      const areaKey = `area:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}`;
      socket.subscriptions.add(areaKey);
      
      socket.emit('subscribed', { 
        type: 'area',
        bounds,
        timestamp: new Date()
      });
      
      // Send initial vessels in the area
      this.sendVesselsInArea(socket, bounds);
    }
  }

  /**
   * Handle geographic area unsubscription
   */
  private handleAreaUnsubscription(socket: AuthenticatedSocket, data: any): void {
    const { bounds } = data;
    
    if (bounds) {
      const areaKey = `area:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}`;
      socket.subscriptions.delete(areaKey);
      
      socket.emit('unsubscribed', { 
        type: 'area',
        bounds,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle collision alert subscription
   */
  private handleAlertSubscription(socket: AuthenticatedSocket, data: any): void {
    const { levels } = data;
    socket.subscriptions.add('alerts');
    
    if (levels && Array.isArray(levels)) {
      levels.forEach((level: string) => {
        socket.subscriptions.add(`alerts:${level}`);
      });
    }
    
    socket.emit('subscribed', { 
      type: 'alerts',
      timestamp: new Date()
    });
    
    // Send current active alerts
    this.sendActiveAlerts(socket);
  }

  /**
   * Handle collision alert unsubscription
   */
  private handleAlertUnsubscription(socket: AuthenticatedSocket): void {
    socket.subscriptions.delete('alerts');
    
    // Remove specific alert level subscriptions
    const toDelete = [];
    for (const subscription of socket.subscriptions) {
      if (subscription.startsWith('alerts:')) {
        toDelete.push(subscription);
      }
    }
    toDelete.forEach(sub => socket.subscriptions.delete(sub));
    
    socket.emit('unsubscribed', { 
      type: 'alerts',
      timestamp: new Date()
    });
  }

  /**
   * Handle vessel query requests
   */
  private async handleVesselQuery(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const vessels = await vesselStore.queryVessels(data);
      socket.emit('vessels', {
        type: 'vessel_query_response',
        data: vessels,
        query: data,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', {
        type: 'vessel_query_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        query: data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle single vessel query
   */
  private async handleSingleVesselQuery(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { mmsi } = data;
      if (!mmsi) {
        throw new Error('MMSI is required');
      }
      
      const vessel = await vesselStore.getVessel(parseInt(mmsi, 10));
      socket.emit('vessel', {
        type: 'vessel_response',
        data: vessel,
        mmsi,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', {
        type: 'vessel_query_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle alert query requests
   */
  private async handleAlertQuery(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const alerts = collisionDetection.getAllAlerts();
      
      let filteredAlerts = alerts;
      
      if (data.active !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => !alert.resolved === data.active);
      }
      
      if (data.levels && Array.isArray(data.levels)) {
        filteredAlerts = filteredAlerts.filter(alert => 
          data.levels.includes(alert.level)
        );
      }
      
      socket.emit('alerts', {
        type: 'alert_query_response',
        data: filteredAlerts,
        query: data,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', {
        type: 'alert_query_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        query: data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send initial data to newly connected client
   */
  private async sendInitialData(socket: AuthenticatedSocket): Promise<void> {
    try {
      // Send current vessel count
      const vesselCount = await vesselStore.getVesselCount();
      socket.emit('system_stats', {
        type: 'system_stats',
        data: {
          vessels: {
            total: vesselCount,
            active: vesselCount,
            updatedLastHour: vesselCount,
            updatedLast24Hours: vesselCount
          },
          alerts: {
            total: collisionDetection.getAllAlerts().length,
            active: collisionDetection.getActiveAlerts().length,
            byLevel: this.getAlertsByLevel()
          },
          system: {
            uptime: process.uptime(),
            messagesProcessed: 0,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: 0
          },
          performance: {
            averageProcessingTime: 0,
            messagesPerSecond: 0,
            websocketConnections: this.connectedClients.size
          }
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to send initial data:', error);
    }
  }

  /**
   * Send vessels in a specific geographic area
   */
  private async sendVesselsInArea(socket: AuthenticatedSocket, bounds: any): Promise<void> {
    try {
      const vessels = await vesselStore.getVesselsInBoundingBox(bounds);
      socket.emit('vessels_in_area', {
        type: 'vessels_in_area',
        data: vessels,
        bounds,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to send vessels in area:', error);
    }
  }

  /**
   * Send active collision alerts
   */
  private sendActiveAlerts(socket: AuthenticatedSocket): void {
    try {
      const activeAlerts = collisionDetection.getActiveAlerts();
      socket.emit('active_alerts', {
        type: 'active_alerts',
        data: activeAlerts,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to send active alerts:', error);
    }
  }

  /**
   * Get alerts grouped by level
   */
  private getAlertsByLevel(): Record<string, number> {
    const alerts = collisionDetection.getAllAlerts();
    const byLevel: Record<string, number> = {
      info: 0,
      warning: 0,
      danger: 0,
      critical: 0
    };
    
    alerts.forEach(alert => {
      byLevel[alert.level]++;
    });
    
    return byLevel;
  }

  /**
   * Start broadcasting system stats and vessels periodically
   */
  private startStatsBroadcast(): void {
    this.statsInterval = setInterval(async () => {
      try {
        const vesselCount = await vesselStore.getVesselCount();
        const allAlerts = collisionDetection.getAllAlerts();
        const activeAlerts = collisionDetection.getActiveAlerts();
        
        const stats: SystemStats = {
          vessels: {
            total: vesselCount,
            active: vesselCount,
            updatedLastHour: vesselCount,
            updatedLast24Hours: vesselCount
          },
          alerts: {
            total: allAlerts.length,
            active: activeAlerts.length,
            byLevel: this.getAlertsByLevel()
          },
          system: {
            uptime: process.uptime(),
            messagesProcessed: 0,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: 0
          },
          performance: {
            averageProcessingTime: 0,
            messagesPerSecond: 0,
            websocketConnections: this.connectedClients.size
          }
        };
        
        this.io.emit('system_stats', {
          type: 'system_stats',
          data: stats,
          timestamp: new Date()
        });

        // Broadcast all vessels to connected clients
        const allVessels = await vesselStore.getAllVessels();
        if (allVessels.length > 0) {
          this.io.emit('vessels', {
            type: 'vessels',
            data: allVessels,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to broadcast system stats:', error);
      }
    }, 5000); // Every 5 seconds to match simulation update interval
  }

  /**
   * Broadcast vessel update to subscribed clients
   */
  public broadcastVesselUpdate(vessel: Vessel, updateType: 'position' | 'static' | 'full'): void {
    this.io.emit('vessel_update', {
      type: 'vessel_update',
      data: {
        vessel,
        updateType
      },
      timestamp: new Date()
    });
  }

  /**
   * Broadcast collision alert to subscribed clients
   */
  public broadcastCollisionAlert(alert: CollisionAlert, action: 'created' | 'updated' | 'resolved'): void {
    this.io.emit('collision_alert', {
      type: 'collision_alert',
      data: {
        alert,
        action
      },
      timestamp: new Date()
    });
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): { connectedClients: number; totalSubscriptions: number } {
    let totalSubscriptions = 0;
    for (const socket of this.connectedClients.values()) {
      totalSubscriptions += socket.subscriptions.size;
    }
    
    return {
      connectedClients: this.connectedClients.size,
      totalSubscriptions
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    this.connectedClients.clear();
  }
}

let webSocketService: WebSocketService | null = null;

export function setupSocketHandlers(io: SocketIOServer): void {
  webSocketService = new WebSocketService(io);
}

export function getWebSocketService(): WebSocketService | null {
  return webSocketService;
}