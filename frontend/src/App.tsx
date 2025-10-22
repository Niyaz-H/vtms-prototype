import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MapView = lazy(() => import('@/pages/MapView'))
const VesselDetail = lazy(() => import('@/pages/VesselDetail'))
const AlertManagement = lazy(() => import('@/pages/AlertManagement'))
const SystemMonitor = lazy(() => import('@/pages/SystemMonitor'))
const SimulationControl = lazy(() => import('@/pages/SimulationControl'))
const Statistics = lazy(() => import('@/pages/Statistics'))
const NotFound = lazy(() => import('@/pages/NotFound'))

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
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          {/* Default route - redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Main routes with Suspense boundaries */}
          <Route path="/dashboard" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <Dashboard />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/map" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <MapView />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/vessels/:mmsi" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <VesselDetail />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/alerts" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <AlertManagement />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/system" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <SystemMonitor />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/stats" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <Statistics />
              </Suspense>
            </Layout>
          } />
          
          <Route path="/simulation" element={
            <Layout>
              <Suspense fallback={<LoadingSkeleton />}>
                <SimulationControl />
              </Suspense>
            </Layout>
          } />
          
          {/* 404 route */}
          <Route path="*" element={
            <Suspense fallback={<LoadingSkeleton />}>
              <NotFound />
            </Suspense>
          } />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App