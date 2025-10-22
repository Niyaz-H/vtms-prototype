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
    let mounted = true
    let connectionTimeout: NodeJS.Timeout
    
    const initWebSocket = async () => {
      // Small delay to allow React StrictMode double-mount to complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
      if (!mounted) {
        console.log('[App] Component unmounted during connection delay, aborting')
        return
      }
      
      try {
        console.log('[App] Initializing WebSocket connection...')
        await webSocketService.connect()
        
        if (mounted) {
          initializeWebSocket(webSocketService)
          console.log('[App] WebSocket initialized successfully')
          
          // Authenticate if user is logged in
          if (isAuthenticated && user?.token) {
            webSocketService.authenticate(user.token, user.id)
          }
        }
      } catch (error) {
        console.error('[App] Failed to initialize WebSocket:', error)
        // Retry connection after a delay
        if (mounted) {
          console.log('[App] Retrying connection in 3 seconds...')
          connectionTimeout = setTimeout(() => {
            if (mounted) {
              initWebSocket()
            }
          }, 3000)
        }
      }
    }

    initWebSocket()

    // Cleanup on unmount
    return () => {
      mounted = false
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
      }
      console.log('[App] Cleaning up WebSocket connection')
      webSocketService.disconnect()
    }
  }, []) // Remove dependencies to prevent reconnection on every render
  
  // Separate effect for authentication
  useEffect(() => {
    if (isAuthenticated && user?.token && webSocketService.connected) {
      webSocketService.authenticate(user.token, user.id)
    }
  }, [isAuthenticated, user])

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