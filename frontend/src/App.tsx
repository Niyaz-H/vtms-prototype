import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import MapView from '@/pages/MapView'
import VesselDetail from '@/pages/VesselDetail'
import AlertManagement from '@/pages/AlertManagement'
import SystemMonitor from '@/pages/SystemMonitor'
import SimulationControl from '@/pages/SimulationControl'
import Statistics from '@/pages/Statistics'
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

  return (
    <div className="min-h-screen bg-background">
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
        
        <Route path="/stats" element={
          <Layout>
            <Statistics />
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