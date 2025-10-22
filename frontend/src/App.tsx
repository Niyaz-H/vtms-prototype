import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

import { webSocketService } from '@/services/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useWebSocketStore } from '@/stores/websocketStore'

// Eager load frequently accessed pages
import Dashboard from '@/pages/Dashboard'
import MapView from '@/pages/MapView'
import AlertManagement from '@/pages/AlertManagement'

// Lazy load less frequently accessed pages
const VesselDetail = lazy(() => import('@/pages/VesselDetail'))
const SystemMonitor = lazy(() => import('@/pages/SystemMonitor'))
const SimulationControl = lazy(() => import('@/pages/SimulationControl'))
const Statistics = lazy(() => import('@/pages/Statistics'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Preload lazy modules on hover/focus
const preloadModule = (importFn: () => Promise<any>) => {
  importFn().catch(() => {})
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { initializeWebSocket } = useWebSocketStore()

  // Preload lazy modules on mount for instant navigation
  useEffect(() => {
    // Preload less frequently used pages in the background
    const preloadTimer = setTimeout(() => {
      preloadModule(() => import('@/pages/VesselDetail'))
      preloadModule(() => import('@/pages/SystemMonitor'))
      preloadModule(() => import('@/pages/SimulationControl'))
      preloadModule(() => import('@/pages/Statistics'))
    }, 2000)

    return () => clearTimeout(preloadTimer)
  }, [])

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
      <Routes>
        {/* Default route - redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Main routes - NO double Suspense boundaries */}
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
        
        <Route path="/alerts" element={
          <Layout>
            <AlertManagement />
          </Layout>
        } />
        
        {/* Lazy-loaded routes with single Suspense */}
        <Route path="/vessels/:mmsi" element={
          <Layout>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSkeleton className="w-full h-full" /></div>}>
              <VesselDetail />
            </Suspense>
          </Layout>
        } />
        
        <Route path="/system" element={
          <Layout>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSkeleton className="w-full h-full" /></div>}>
              <SystemMonitor />
            </Suspense>
          </Layout>
        } />
        
        <Route path="/stats" element={
          <Layout>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSkeleton className="w-full h-full" /></div>}>
              <Statistics />
            </Suspense>
          </Layout>
        } />
        
        <Route path="/simulation" element={
          <Layout>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSkeleton className="w-full h-full" /></div>}>
              <SimulationControl />
            </Suspense>
          </Layout>
        } />
        
        {/* 404 route */}
        <Route path="*" element={
          <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingSkeleton className="w-full h-full" /></div>}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </div>
  )
}

export default App