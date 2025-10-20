import { useEffect, useState } from 'react'
import {
  MapIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocketStore } from '@/stores/websocketStore'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { connected, vessels, alerts } = useWebSocketStore()

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Status Bar */}
        <div className="bg-white border-t border-secondary-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-success' : 'bg-danger'
                }`} />
                <span className="text-secondary-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Vessel Count */}
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-secondary-500" />
                <span className="text-secondary-600">
                  {vessels.length} vessels
                </span>
              </div>

              {/* Alert Count */}
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-secondary-500" />
                <span className="text-secondary-600">
                  {alerts.filter(a => !a.resolved).length} active alerts
                </span>
              </div>
            </div>

            <div className="text-secondary-500 text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout