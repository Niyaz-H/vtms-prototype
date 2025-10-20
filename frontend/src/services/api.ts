import axios, { AxiosInstance, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp
        config.metadata = { startTime: new Date() }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Calculate request duration
        const endTime = new Date()
        const duration = response.config.metadata?.startTime?.getTime()
          ? endTime.getTime() - response.config.metadata.startTime.getTime()
          : 0
        
        console.log(`API Request: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`)
        
        return response
      },
      (error) => {
        const { response, request } = error
        
        if (response) {
          // Server responded with error status
          const { status, data } = response
          const message = data?.error || data?.message || 'An error occurred'
          
          switch (status) {
            case 400:
              toast.error(`Bad Request: ${message}`)
              break
            case 401:
              toast.error('Unauthorized: Please log in again')
              break
            case 403:
              toast.error('Forbidden: You do not have permission to perform this action')
              break
            case 404:
              toast.error('Not Found: The requested resource was not found')
              break
            case 429:
              toast.error('Too Many Requests: Please try again later')
              break
            case 500:
              toast.error('Server Error: Please try again later')
              break
            default:
              toast.error(`Error ${status}: ${message}`)
          }
        } else if (request) {
          // Request was made but no response received
          toast.error('Network Error: Please check your connection')
        } else {
          // Something happened in setting up the request
          toast.error('Request Error: Please try again')
        }
        
        return Promise.reject(error)
      }
    )
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params })
    return response.data.data || response.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data)
    return response.data.data || response.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data)
    return response.data.data || response.data
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data)
    return response.data.data || response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url)
    return response.data.data || response.data
  }

  // Vessel API methods
  async getVessels(query?: VesselQuery): Promise<Vessel[]> {
    return this.get<Vessel[]>('/vessels', query)
  }

  async getVessel(mmsi: number): Promise<Vessel | null> {
    try {
      return await this.get<Vessel>(`/vessels/${mmsi}`)
    } catch (error) {
      return null
    }
  }

  async getVesselHistory(mmsi: number, startTime: string, endTime: string): Promise<any[]> {
    return this.get<any[]>(`/vessels/${mmsi}/history`, { startTime, endTime })
  }

  // Alert API methods
  async getAlerts(query?: AlertQuery): Promise<CollisionAlert[]> {
    return this.get<CollisionAlert[]>('/alerts', query)
  }

  async getAlert(id: string): Promise<CollisionAlert | null> {
    try {
      return await this.get<CollisionAlert>(`/alerts/${id}`)
    } catch (error) {
      return null
    }
  }

  async resolveAlert(id: string): Promise<CollisionAlert> {
    return this.put<CollisionAlert>(`/alerts/${id}/resolve`)
  }

  // System API methods
  async getSystemStats(): Promise<SystemStats> {
    return this.get<SystemStats>('/stats')
  }

  async getHealth(): Promise<HealthCheck> {
    return this.get<HealthCheck>('/health')
  }

  // Simulation API methods
  async startSimulation(): Promise<{ message: string }> {
    return this.post<{ message: string }>('/simulation/start')
  }

  async stopSimulation(): Promise<{ message: string }> {
    return this.post<{ message: string }>('/simulation/stop')
  }

  async getSimulationStatus(): Promise<SimulationStatus> {
    return this.get<SimulationStatus>('/simulation/status')
  }

  async addSimulationVessel(vessel: SimulationVessel): Promise<{ message: string }> {
    return this.post<{ message: string }>('/simulation/vessels', vessel)
  }

  async removeSimulationVessel(mmsi: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/simulation/vessels/${mmsi}`)
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export types
export interface Vessel {
  id: string;
  mmsi: number;
  name?: string;
  callSign?: string;
  vesselType?: number;
  position: { latitude: number; longitude: number };
  course?: number;
  speed?: number;
  heading?: number;
  status?: number;
  timestamp: string;
  lastUpdate: string;
  source: 'AIS';
  dimension?: { length: number; width: number };
  draught?: number;
  destination?: string;
}

export interface VesselQuery {
  boundingBox?: { north: number; south: number; east: number; west: number };
  vesselTypes?: number[];
  speedRange?: { min?: number; max?: number };
  status?: number[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CollisionAlert {
  id: string;
  vessels: [string, string];
  proximity: {
    vessel1Id: string;
    vessel2Id: string;
    distance: number;
    cpa?: number;
    tcpa?: number;
    bearing?: number;
    relativeCourse?: number;
    relativeSpeed?: number;
  };
  level: 'info' | 'warning' | 'danger' | 'critical';
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  predictedCollisionPoint?: { latitude: number; longitude: number };
  predictedCollisionTime?: string;
}

export interface AlertQuery {
  level?: string[];
  active?: boolean;
  vesselIds?: string[];
  boundingBox?: { north: number; south: number; east: number; west: number };
  startTime?: string;
  endTime?: string;
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
    byLevel: Record<string, number>;
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

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: string; responseTime?: number; error?: string; lastCheck: string };
    redis: { status: string; responseTime?: number; error?: string; lastCheck: string };
    websocket: { status: string; responseTime?: number; error?: string; lastCheck: string };
  };
  version: string;
  uptime: number;
}

export interface SimulationStatus {
  running: boolean;
  vesselCount: number;
}

export interface SimulationVessel {
  mmsi?: number;
  name?: string;
  vesselType?: number;
  position?: { latitude: number; longitude: number };
  course?: number;
  speed?: number;
  heading?: number;
  status?: number;
  destination?: string;
  dimension?: { length: number; width: number };
}

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime?: Date
    }
  }
}

// Export convenience functions
export const vesselApi = {
  getAll: (query?: VesselQuery) => apiClient.getVessels(query),
  getById: (mmsi: number) => apiClient.getVessel(mmsi),
  getHistory: (mmsi: number, startTime: string, endTime: string) => 
    apiClient.getVesselHistory(mmsi, startTime, endTime),
}

export const alertApi = {
  getAll: (query?: AlertQuery) => apiClient.getAlerts(query),
  getById: (id: string) => apiClient.getAlert(id),
  resolve: (id: string) => apiClient.resolveAlert(id),
}

export const systemApi = {
  getStats: () => apiClient.getSystemStats(),
  getHealth: () => apiClient.getHealth(),
}

export const simulationApi = {
  start: () => apiClient.startSimulation(),
  stop: () => apiClient.stopSimulation(),
  getStatus: () => apiClient.getSimulationStatus(),
  addVessel: (vessel: SimulationVessel) => apiClient.addSimulationVessel(vessel),
  removeVessel: (mmsi: number) => apiClient.removeSimulationVessel(mmsi),
}

export default apiClient