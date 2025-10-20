import { create } from 'zustand'
import type { CollisionAlert } from '@/types/alert'
import type { Vessel } from '@/types/vessel'

interface SystemStats {
  vessels: any
  alerts: any
  system: any
  simulation: any
  timestamp: string
}

export const useWebSocketStore = create((set: any) => ({
  socket: null,
  connected: false,
  vessels: [] as Vessel[],
  alerts: [] as CollisionAlert[],
  systemStats: null as SystemStats | null,
  
  initializeWebSocket: (socket: any) => {
    set({ socket, connected: socket?.connected || false })
    
    if (socket) {
      socket.on('vessels', (vessels: Vessel[]) => {
        set({ vessels })
      })
      
      socket.on('vessel_update', (data: any) => {
        const { vessel } = data
        set((state: any) => {
          const exists = state.vessels.some((v: Vessel) => v.mmsi === vessel.mmsi)
          if (exists) {
            return {
              vessels: state.vessels.map((v: Vessel) => 
                v.mmsi === vessel.mmsi ? vessel : v
              )
            }
          } else {
            return { vessels: [...state.vessels, vessel] }
          }
        })
      })
      
      socket.on('collision_alerts', (data: any) => {
        set({ alerts: data.data })
      })
      
      socket.on('collision_alert', (data: any) => {
        const { alert, action } = data
        set((state: any) => {
          if (action === 'created') {
            return { alerts: [...state.alerts, alert] }
          } else if (action === 'updated') {
            return {
              alerts: state.alerts.map((a: CollisionAlert) => 
                a.id === alert.id ? alert : a
              )
            }
          } else if (action === 'resolved') {
            return {
              alerts: state.alerts.map((a: CollisionAlert) => 
                a.id === alert.id ? { ...a, resolved: true } : a
              )
            }
          }
          return state
        })
      })
      
      socket.on('system_stats', (stats: any) => {
        set({ systemStats: stats.data })
      })
      
      socket.on('connect', () => {
        set({ connected: true })
      })
      
      socket.on('disconnect', () => {
        set({ connected: false })
      })
    }
  },
  
  updateVessels: (vessels: Vessel[]) => set({ vessels }),
  updateAlerts: (alerts: CollisionAlert[]) => set({ alerts }),
  updateSystemStats: (systemStats: SystemStats) => set({ systemStats }),
  
  addVessel: (vessel: Vessel) => set((state: any) => ({ 
    vessels: [...state.vessels, vessel] 
  })),
  updateVessel: (vessel: Vessel) => set((state: any) => ({
    vessels: state.vessels.map((v: Vessel) => 
      v.mmsi === vessel.mmsi ? vessel : v
    )
  })),
  removeVessel: (mmsi: number) => set((state: any) => ({
    vessels: state.vessels.filter((v: Vessel) => v.mmsi !== mmsi)
  })),
  
  addAlert: (alert: CollisionAlert) => set((state: any) => ({ 
    alerts: [...state.alerts, alert] 
  })),
  updateAlert: (alert: CollisionAlert) => set((state: any) => ({
    alerts: state.alerts.map((a: CollisionAlert) => 
      a.id === alert.id ? alert : a
    )
  })),
  removeAlert: (alertId: string) => set((state: any) => ({
    alerts: state.alerts.filter((a: CollisionAlert) => a.id !== alertId)
  })),
}))