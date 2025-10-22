import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { CollisionAlert } from '@/types/alert'
import type { Vessel } from '@/types/vessel'

interface SystemStats {
  vessels: any
  alerts: any
  system: any
  simulation: any
  timestamp: string
}

interface VesselState {
  socket: any
  connected: boolean
  vessels: Vessel[]
  alerts: CollisionAlert[]
  systemStats: SystemStats | null
  lastUpdate: number
}

interface VesselActions {
  initializeWebSocket: (socket: any) => void
  updateVessels: (vessels: Vessel[]) => void
  updateAlerts: (alerts: CollisionAlert[]) => void
  updateSystemStats: (systemStats: SystemStats) => void
  addVessel: (vessel: Vessel) => void
  updateVessel: (vessel: Vessel) => void
  removeVessel: (mmsi: number) => void
  addAlert: (alert: CollisionAlert) => void
  updateAlert: (alert: CollisionAlert) => void
  removeAlert: (alertId: string) => void
  batchUpdateVessels: (vessels: Vessel[]) => void
}

export const useWebSocketStore = create<VesselState & VesselActions>()(
  subscribeWithSelector((set) => ({
    socket: null,
    connected: false,
    vessels: [],
    alerts: [],
    systemStats: null,
    lastUpdate: Date.now(),
    
    initializeWebSocket: (socket: any) => {
      set({ socket, connected: socket?.connected || false })
      
      if (socket) {
        socket.on('vessels', (vessels: Vessel[]) => {
          set({ vessels, lastUpdate: Date.now() })
        })
        
        socket.on('vessel_update', (data: any) => {
          const { vessel } = data
          // Batch updates using requestAnimationFrame for better performance
          requestAnimationFrame(() => {
            set((state) => {
              const exists = state.vessels.some((v: Vessel) => v.mmsi === vessel.mmsi)
              if (exists) {
                return {
                  vessels: state.vessels.map((v: Vessel) => 
                    v.mmsi === vessel.mmsi ? vessel : v
                  ),
                  lastUpdate: Date.now()
                }
              } else {
                return { 
                  vessels: [...state.vessels, vessel],
                  lastUpdate: Date.now()
                }
              }
            })
          })
        })
        
        socket.on('collision_alerts', (data: any) => {
          set({ alerts: data.data, lastUpdate: Date.now() })
        })
        
        socket.on('collision_alert', (data: any) => {
          const { alert, action } = data
          requestAnimationFrame(() => {
            set((state) => {
              if (action === 'created') {
                return { 
                  alerts: [...state.alerts, alert],
                  lastUpdate: Date.now()
                }
              } else if (action === 'updated') {
                return {
                  alerts: state.alerts.map((a: CollisionAlert) => 
                    a.id === alert.id ? alert : a
                  ),
                  lastUpdate: Date.now()
                }
              } else if (action === 'resolved') {
                return {
                  alerts: state.alerts.map((a: CollisionAlert) => 
                    a.id === alert.id ? { ...a, resolved: true } : a
                  ),
                  lastUpdate: Date.now()
                }
              }
              return state
            })
          })
        })
        
        socket.on('system_stats', (stats: any) => {
          set({ systemStats: stats.data, lastUpdate: Date.now() })
        })
        
        socket.on('connect', () => {
          set({ connected: true })
        })
        
        socket.on('disconnect', () => {
          set({ connected: false })
        })
      }
    },
    
    updateVessels: (vessels: Vessel[]) => set({ vessels, lastUpdate: Date.now() }),
    updateAlerts: (alerts: CollisionAlert[]) => set({ alerts, lastUpdate: Date.now() }),
    updateSystemStats: (systemStats: SystemStats) => set({ systemStats, lastUpdate: Date.now() }),
    
    addVessel: (vessel: Vessel) => set((state) => ({ 
      vessels: [...state.vessels, vessel],
      lastUpdate: Date.now()
    })),
    updateVessel: (vessel: Vessel) => set((state) => ({
      vessels: state.vessels.map((v: Vessel) => 
        v.mmsi === vessel.mmsi ? vessel : v
      ),
      lastUpdate: Date.now()
    })),
    removeVessel: (mmsi: number) => set((state) => ({
      vessels: state.vessels.filter((v: Vessel) => v.mmsi !== mmsi),
      lastUpdate: Date.now()
    })),
    
    addAlert: (alert: CollisionAlert) => set((state) => ({ 
      alerts: [...state.alerts, alert],
      lastUpdate: Date.now()
    })),
    updateAlert: (alert: CollisionAlert) => set((state) => ({
      alerts: state.alerts.map((a: CollisionAlert) => 
        a.id === alert.id ? alert : a
      ),
      lastUpdate: Date.now()
    })),
    removeAlert: (alertId: string) => set((state) => ({
      alerts: state.alerts.filter((a: CollisionAlert) => a.id !== alertId),
      lastUpdate: Date.now()
    })),
    
    // Batch update multiple vessels at once
    batchUpdateVessels: (vessels: Vessel[]) => set((state) => {
      const vesselMap = new Map(state.vessels.map(v => [v.mmsi, v]))
      vessels.forEach(vessel => vesselMap.set(vessel.mmsi, vessel))
      return {
        vessels: Array.from(vesselMap.values()),
        lastUpdate: Date.now()
      }
    }),
  }))
)

// Selective hooks for better performance
export const useVessels = () => useWebSocketStore(state => state.vessels)
export const useAlerts = () => useWebSocketStore(state => state.alerts)
export const useActiveAlerts = () => useWebSocketStore(state => 
  state.alerts.filter(alert => !alert.resolved)
)
export const useVesselCount = () => useWebSocketStore(state => state.vessels.length)
export const useConnected = () => useWebSocketStore(state => state.connected)
export const useSystemStats = () => useWebSocketStore(state => state.systemStats)