import { useEffect, useState } from 'react'
import { useWebSocketStore } from '@/stores/websocketStore'

const Dashboard: React.FC = () => {
  const { vessels, alerts, systemStats } = useWebSocketStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const activeAlerts = alerts.filter(a => !a.resolved)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-secondary-900">Dashboard</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-500">Total Vessels</h3>
          <p className="text-3xl font-bold text-secondary-900 mt-2">{vessels.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-500">Active Alerts</h3>
          <p className="text-3xl font-bold text-danger mt-2">{activeAlerts.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-500">System Status</h3>
          <p className="text-3xl font-bold text-success mt-2">Healthy</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-500">Uptime</h3>
          <p className="text-3xl font-bold text-secondary-900 mt-2">
            {systemStats?.system?.uptime ? Math.floor(systemStats.system.uptime / 3600) : 0}h
          </p>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Alerts</h3>
        {activeAlerts.length === 0 ? (
          <p className="text-secondary-500">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded">
                <div>
                  <p className="font-medium text-secondary-900">
                    Collision Alert: {alert.vessels.join(' - ')}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Level: {alert.level} | {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard