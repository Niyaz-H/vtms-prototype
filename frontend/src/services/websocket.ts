import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import type { BoundingBox, AlertLevel } from '../types'

// WebSocket configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

interface WebSocketConfig {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionDelay?: number
  reconnectionAttempts?: number
  timeout?: number
}

class WebSocketService {
  private socket: Socket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private isConnecting = false

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      ...config,
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[WebSocket] Attempting to connect to:', WS_URL)
      
      // If already connected, resolve immediately
      if (this.socket?.connected) {
        console.log('[WebSocket] Already connected')
        resolve()
        return
      }

      // If socket exists but not connected, try to reconnect it
      if (this.socket && !this.socket.connected) {
        console.log('[WebSocket] Socket exists, reconnecting...')
        this.isConnecting = true
        
        const onConnect = () => {
          console.log('[WebSocket] Successfully reconnected!')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.socket?.off('connect', onConnect)
          this.socket?.off('connect_error', onError)
          resolve()
        }
        
        const onError = (error: Error) => {
          console.error('[WebSocket] Reconnection error:', error)
          this.isConnecting = false
          this.socket?.off('connect', onConnect)
          this.socket?.off('connect_error', onError)
          reject(error)
        }
        
        this.socket.once('connect', onConnect)
        this.socket.once('connect_error', onError)
        this.socket.connect()
        return
      }

      // If currently connecting, wait for it
      if (this.isConnecting) {
        console.log('[WebSocket] Connection already in progress, waiting...')
        // Wait for the connection to complete
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection)
            resolve()
          } else if (!this.isConnecting) {
            clearInterval(checkConnection)
            reject(new Error('Connection failed'))
          }
        }, 100)
        return
      }

      // Create new socket connection
      this.isConnecting = true

      try {
        this.socket = io(WS_URL, {
          autoConnect: false,
          reconnection: this.config.reconnection,
          reconnectionDelay: this.config.reconnectionDelay,
          reconnectionAttempts: this.config.reconnectionAttempts,
          timeout: this.config.timeout,
          transports: ['websocket', 'polling'],
        })

        console.log('[WebSocket] Socket.IO instance created, connecting...')
        this.setupEventListeners()

        this.socket.on('connect', () => {
          console.log('[WebSocket] Successfully connected!')
          this.isConnecting = false
          this.reconnectAttempts = 0
          toast.success('Connected to real-time updates')
          resolve()
        })

        this.socket.on('connect_error', (error) => {
          console.error('[WebSocket] Connection error:', error)
          this.isConnecting = false
          toast.error('Failed to connect to real-time updates')
          reject(error)
        })
        
        // Manually initiate the connection
        this.socket.connect()
        console.log('[WebSocket] Connection initiated')
      } catch (error) {
        console.error('[WebSocket] Exception during connection:', error)
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('WebSocket disconnected')
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      toast.error('Disconnected from real-time updates')
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      toast.success('Reconnected to real-time updates')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnect attempt:', attemptNumber)
      this.reconnectAttempts = attemptNumber
    })

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed')
      toast.error('Failed to reconnect to real-time updates')
    })

    // Authentication
    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data)
    })

    this.socket.on('authentication_error', (data) => {
      console.error('WebSocket authentication error:', data)
      toast.error('Authentication failed')
    })

    // Subscription events
    this.socket.on('subscribed', (data) => {
      console.log('Subscribed to:', data)
    })

    this.socket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from:', data)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      toast.error('WebSocket error occurred')
    })
  }

  /**
   * Authenticate with the server
   */
  authenticate(token: string, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('authenticate', { token, userId })
    }
  }

  /**
   * Subscribe to vessel updates
   */
  subscribeToVessels(vesselIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_vessels', { vesselIds })
    }
  }

  /**
   * Unsubscribe from vessel updates
   */
  unsubscribeFromVessels(vesselIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_vessels', { vesselIds })
    }
  }

  /**
   * Subscribe to area updates
   */
  subscribeToArea(bounds: BoundingBox): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_area', { bounds })
    }
  }

  /**
   * Unsubscribe from area updates
   */
  unsubscribeFromArea(bounds: BoundingBox): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_area', { bounds })
    }
  }

  /**
   * Subscribe to collision alerts
   */
  subscribeToAlerts(levels?: AlertLevel[]): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_alerts', { levels })
    }
  }

  /**
   * Unsubscribe from collision alerts
   */
  unsubscribeFromAlerts(): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_alerts')
    }
  }

  /**
   * Get vessels
   */
  getVessels(query?: any): void {
    if (this.socket?.connected) {
      this.socket.emit('get_vessels', query)
    }
  }

  /**
   * Get specific vessel
   */
  getVessel(mmsi: number): void {
    if (this.socket?.connected) {
      this.socket.emit('get_vessel', { mmsi })
    }
  }

  /**
   * Get alerts
   */
  getAlerts(query?: any): void {
    if (this.socket?.connected) {
      this.socket.emit('get_alerts', query)
    }
  }

  /**
   * Ping server for connection health
   */
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping')
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  /**
   * Add one-time event listener
   */
  once(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback)
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, ...args: any[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args)
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean
    connecting: boolean
    reconnectAttempts: number
  } {
    return {
      connected: this.connected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService()

// Export convenience functions
export const connectWebSocket = () => webSocketService.connect()
export const disconnectWebSocket = () => webSocketService.disconnect()
export const isWebSocketConnected = () => webSocketService.connected

// Export subscription functions
export const subscribeToVessels = (vesselIds: string[]) => 
  webSocketService.subscribeToVessels(vesselIds)

export const subscribeToArea = (bounds: BoundingBox) => 
  webSocketService.subscribeToArea(bounds)

export const subscribeToAlerts = (levels?: AlertLevel[]) =>
  webSocketService.subscribeToAlerts(levels)

export default webSocketService