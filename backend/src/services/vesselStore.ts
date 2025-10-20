/**
 * Vessel Store Service
 * Manages vessel state using Redis for real-time data and PostgreSQL for persistence
 */

import Redis from 'ioredis';
import { Pool } from 'pg';
import { Vessel, VesselQuery, BoundingBox } from '../types';
import config from '../config';

export class VesselStore {
  private redis: Redis | null = null;
  private postgres: Pool | null = null;
  private fallbackMode: boolean = false;
  private memoryStore: Map<string, Vessel> = new Map();

  constructor() {
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      // Try to connect to Redis
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await this.redis.ping();
      this.setupRedisKeyExpiration();
      console.log('Redis connected successfully');
    } catch (error) {
      console.warn('Redis connection failed, using memory store:', error);
      this.redis = null;
    }

    try {
      // Try to connect to PostgreSQL
      this.postgres = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.username,
        password: config.database.password,
        ssl: config.database.ssl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      await this.postgres.query('SELECT 1');
      console.log('PostgreSQL connected successfully');
    } catch (error) {
      console.warn('PostgreSQL connection failed, using memory store:', error);
      this.postgres = null;
    }

    // Enable fallback mode if either database is not available
    if (!this.redis || !this.postgres) {
      this.fallbackMode = true;
      console.log('Running in fallback mode (memory store only)');
    }
  }

  /**
   * Setup Redis key expiration for vessel data
   */
  private setupRedisKeyExpiration(): void {
    if (!this.redis) return;
    
    // Vessel positions expire after 1 hour of no updates
    this.redis.config('SET', 'timeout', 3600);
  }

  /**
   * Store or update vessel data
   */
  public async storeVessel(vessel: Vessel): Promise<void> {
    if (this.fallbackMode) {
      this.memoryStore.set(vessel.mmsi.toString(), vessel);
      return;
    }

    if (!this.redis) {
      throw new Error('Redis not available');
    }

    const vesselKey = `vessel:${vessel.mmsi}`;
    const positionKey = `position:${vessel.mmsi}`;
    
    try {
      // Store vessel data in Redis as JSON
      await this.redis.setex(vesselKey, 3600, JSON.stringify(vessel));
      
      // Store position data in Redis for spatial queries
      const positionData = {
        mmsi: vessel.mmsi,
        lat: vessel.position.latitude,
        lon: vessel.position.longitude,
        timestamp: vessel.timestamp.getTime(),
        course: vessel.course,
        speed: vessel.speed,
        name: vessel.name
      };
      
      await this.redis.setex(positionKey, 3600, JSON.stringify(positionData));
      
      // Add to vessel tracking set
      await this.redis.sadd('vessels:active', vessel.mmsi.toString());
      
      // Persist to PostgreSQL (async, don't wait)
      if (this.postgres) {
        this.persistToPostgres(vessel).catch(error => {
          console.error('Failed to persist vessel to PostgreSQL:', error);
        });
      }
      
    } catch (error) {
      console.error('Failed to store vessel:', error);
      throw error;
    }
  }

  /**
   * Get vessel by MMSI
   */
  public async getVessel(mmsi: number): Promise<Vessel | null> {
    if (this.fallbackMode) {
      return this.memoryStore.get(mmsi.toString()) || null;
    }

    if (!this.redis) {
      return null;
    }

    try {
      const vesselKey = `vessel:${mmsi}`;
      const vesselData = await this.redis.get(vesselKey);
      
      if (!vesselData) {
        return null;
      }
      
      const vessel = JSON.parse(vesselData) as Vessel;
      
      // Convert timestamp back to Date
      vessel.timestamp = new Date(vessel.timestamp);
      vessel.lastUpdate = new Date(vessel.lastUpdate);
      
      return vessel;
    } catch (error) {
      console.error('Failed to get vessel:', error);
      return null;
    }
  }

  /**
   * Get all active vessels
   */
  public async getAllVessels(): Promise<Vessel[]> {
    if (this.fallbackMode) {
      return Array.from(this.memoryStore.values());
    }

    if (!this.redis) {
      return [];
    }

    try {
      const activeMmsis = await this.redis.smembers('vessels:active');
      const vessels: Vessel[] = [];
      
      for (const mmsi of activeMmsis) {
        const vessel = await this.getVessel(parseInt(mmsi, 10));
        if (vessel) {
          vessels.push(vessel);
        }
      }
      
      return vessels;
    } catch (error) {
      console.error('Failed to get all vessels:', error);
      return [];
    }
  }

  /**
   * Get vessels within bounding box
   */
  public async getVesselsInBoundingBox(bounds: BoundingBox): Promise<Vessel[]> {
    try {
      // For simplicity, we'll fetch all vessels and filter
      // In production, you'd use Redis geospatial commands or PostGIS
      const allVessels = await this.getAllVessels();
      
      return allVessels.filter(vessel => {
        const { latitude, longitude } = vessel.position;
        return latitude >= bounds.south &&
               latitude <= bounds.north &&
               longitude >= bounds.west &&
               longitude <= bounds.east;
      });
    } catch (error) {
      console.error('Failed to get vessels in bounding box:', error);
      return [];
    }
  }

  /**
   * Query vessels with filters
   */
  public async queryVessels(query: VesselQuery): Promise<Vessel[]> {
    try {
      let vessels: Vessel[];
      
      if (query.boundingBox) {
        vessels = await this.getVesselsInBoundingBox(query.boundingBox);
      } else {
        vessels = await this.getAllVessels();
      }
      
      // Apply filters
      if (query.vesselTypes && query.vesselTypes.length > 0) {
        vessels = vessels.filter(vessel => 
          vessel.vesselType && query.vesselTypes!.includes(vessel.vesselType)
        );
      }
      
      if (query.speedRange) {
        vessels = vessels.filter(vessel => {
          if (!vessel.speed) return false;
          const speed = vessel.speed;
          return (!query.speedRange!.min || speed >= query.speedRange!.min) &&
                 (!query.speedRange!.max || speed <= query.speedRange!.max);
        });
      }
      
      if (query.status && query.status.length > 0) {
        vessels = vessels.filter(vessel => 
          vessel.status && query.status!.includes(vessel.status)
        );
      }
      
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        vessels = vessels.filter(vessel => 
          (vessel.name && vessel.name.toLowerCase().includes(searchTerm)) ||
          vessel.mmsi.toString().includes(searchTerm)
        );
      }
      
      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return vessels.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to query vessels:', error);
      return [];
    }
  }

  /**
   * Get vessel count
   */
  public async getVesselCount(): Promise<number> {
    if (this.fallbackMode) {
      return this.memoryStore.size;
    }

    if (!this.redis) {
      return 0;
    }

    try {
      return await this.redis.scard('vessels:active');
    } catch (error) {
      console.error('Failed to get vessel count:', error);
      return 0;
    }
  }

  /**
   * Remove vessel from active tracking
   */
  public async removeVessel(mmsi: number): Promise<void> {
    if (this.fallbackMode) {
      this.memoryStore.delete(mmsi.toString());
      return;
    }

    if (!this.redis) {
      return;
    }

    try {
      const vesselKey = `vessel:${mmsi}`;
      const positionKey = `position:${mmsi}`;
      
      await this.redis.del(vesselKey);
      await this.redis.del(positionKey);
      await this.redis.srem('vessels:active', mmsi.toString());
    } catch (error) {
      console.error('Failed to remove vessel:', error);
      throw error;
    }
  }

  /**
   * Clean up old vessels (older than specified time)
   */
  public async cleanupOldVessels(maxAgeMinutes: number = 60): Promise<number> {
    try {
      const allVessels = await this.getAllVessels();
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
      let removedCount = 0;
      
      for (const vessel of allVessels) {
        if (vessel.timestamp < cutoffTime) {
          await this.removeVessel(vessel.mmsi);
          removedCount++;
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error('Failed to cleanup old vessels:', error);
      return 0;
    }
  }

  /**
   * Get vessels updated in the last N minutes
   */
  public async getRecentlyUpdatedVessels(minutes: number): Promise<Vessel[]> {
    try {
      const allVessels = await this.getAllVessels();
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      
      return allVessels.filter(vessel => vessel.timestamp >= cutoffTime);
    } catch (error) {
      console.error('Failed to get recently updated vessels:', error);
      return [];
    }
  }

  /**
   * Persist vessel data to PostgreSQL
   */
  private async persistToPostgres(vessel: Vessel): Promise<void> {
    if (!this.postgres) {
      return;
    }

    try {
      const query = `
        INSERT INTO vessels (
          mmsi, name, call_sign, vessel_type, latitude, longitude, 
          course, speed, heading, status, timestamp, last_update,
          length, width, draught, destination
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (mmsi) 
        DO UPDATE SET
          name = EXCLUDED.name,
          call_sign = EXCLUDED.call_sign,
          vessel_type = EXCLUDED.vessel_type,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          course = EXCLUDED.course,
          speed = EXCLUDED.speed,
          heading = EXCLUDED.heading,
          status = EXCLUDED.status,
          timestamp = EXCLUDED.timestamp,
          last_update = EXCLUDED.last_update,
          length = EXCLUDED.length,
          width = EXCLUDED.width,
          draught = EXCLUDED.draught,
          destination = EXCLUDED.destination
      `;
      
      await this.postgres.query(query, [
        vessel.mmsi,
        vessel.name || null,
        vessel.callSign || null,
        vessel.vesselType || null,
        vessel.position.latitude,
        vessel.position.longitude,
        vessel.course || null,
        vessel.speed || null,
        vessel.heading || null,
        vessel.status || null,
        vessel.timestamp,
        vessel.lastUpdate,
        vessel.dimension?.length || null,
        vessel.dimension?.width || null,
        vessel.draught || null,
        vessel.destination || null
      ]);
    } catch (error) {
      console.error('Failed to persist vessel to PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Get vessel history from PostgreSQL
   */
  public async getVesselHistory(
    mmsi: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<any[]> {
    if (!this.postgres) {
      return [];
    }

    try {
      const query = `
        SELECT * FROM vessel_history 
        WHERE mmsi = $1 AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp ASC
      `;
      
      const result = await this.postgres.query(query, [mmsi, startTime, endTime]);
      return result.rows;
    } catch (error) {
      console.error('Failed to get vessel history:', error);
      return [];
    }
  }

  /**
   * Health check for the store
   */
  public async healthCheck(): Promise<{ redis: boolean; postgres: boolean }> {
    let redisStatus = false;
    let postgresStatus = false;

    if (this.redis) {
      try {
        const result = await this.redis.ping();
        redisStatus = result === 'PONG';
      } catch (error) {
        redisStatus = false;
      }
    }

    if (this.postgres) {
      try {
        const result = await this.postgres.query('SELECT 1');
        postgresStatus = result.rows.length > 0;
      } catch (error) {
        postgresStatus = false;
      }
    }

    return {
      redis: redisStatus,
      postgres: postgresStatus
    };
  }

  /**
   * Close connections
   */
  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.postgres) {
      await this.postgres.end();
    }
    this.memoryStore.clear();
  }
}

export const vesselStore = new VesselStore();