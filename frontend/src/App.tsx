import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from 'react-query'

import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import MapView from '@/pages/MapView'
import VesselDetail from '@/pages/VesselDetail'
import AlertManagement from '@/pages/AlertManagement'
import SystemMonitor from '@/pages/SystemMonitor'
import SimulationControl from '@/pages/SimulationControl'
import NotFound from '@/pages/NotFound'

import { webSocketService } from '@/services/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useWebSocketStore } from '@/stores/websocketStore'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { initializeWebSocket } = useWebSocketStore()

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        await webSocketService.connect()
        initializeWebSocket(webSocketService)
        
        // Authenticate if user is logged in
        if (isAuthenticated && user?.token) {
          webSocketService.authenticate(user.token, user.id)
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error)
      }
    }

    initWebSocket()

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect()
    }
  }, [isAuthenticated, user, initializeWebSocket])

  // Check system health on app load
  const { data: healthData, error: healthError } = useQuery(
    'health',
    async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Health check failed')
      return response.json()
    },
    {
      refetchInterval: 60000, // Refetch every minute
      retry: 3,
    }
  )

  // Show connection status
  const connectionStatus = webSocketService.getStatus()
  const isSystemHealthy = healthData?.status === 'healthy' || !healthError

  return (
    <div className="min-h-screen bg-background">
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          connectionStatus.connected 
            ? 'bg-success/10 text-success border border-success/20' 
            : 'bg-danger/10 text-danger border border-danger/20'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus.connected ? 'bg-success' : 'bg-danger'
          }`} />
          {connectionStatus.connected ? 'Connected' : 'Disconnected'}
        </div>
        
        {isSystemHealthy ? (
          <div className="bg-success/10 text-success border border-success/20 px-3 py-1 rounded-full text-xs font-medium">
            System Healthy
          </div>
        ) : (
          <div className="bg-warning/10 text-warning border border-warning/20 px-3 py-1 rounded-full text-xs font-medium">
            System Issues
          </div>
        )}
      </div>

      <Routes>
        {/* Default route - redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Main routes */}
        <Route path="/dashboard" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        
        <Route path="/map" element={
          <Layout>
            <MapView />
          </Layout>
        } />
        
        <Route path="/vessels/:mmsi" element={
          <Layout>
            <VesselDetail />
          </Layout>
        } />
        
        <Route path="/alerts" element={
          <Layout>
            <AlertManagement />
          </Layout>
        } />
        
        <Route path="/system" element={
          <Layout>
            <SystemMonitor />
          </Layout>
        } />
        
        <Route path="/simulation" element={
          <Layout>
            <SimulationControl />
          </Layout>
        } />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App