import { useWebSocketStore } from '@/stores/websocketStore'
import { DashboardCardSkeleton, AlertCardSkeleton } from '@/components/LoadingSkeleton'
import { usePageLoading } from '@/hooks/usePageLoading'

const Dashboard: React.FC = () => {
  const { vessels, alerts, systemStats } = useWebSocketStore()
  const loading = usePageLoading()
  const activeAlerts = alerts.filter(a => !a.resolved)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-6 w-64 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>

        {/* Recent Alerts Skeleton */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <AlertCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-blue-600">Dashboard</h2>
        <div className="text-sm text-slate-600">
          Welcome back! Here's your system overview.
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">Total Vessels</h3>
          <p className="text-4xl font-bold mt-2 text-white">{vessels.length}</p>
        </div>
        
        <div className="bg-red-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium text-red-100 uppercase tracking-wide">Active Alerts</h3>
          <p className="text-4xl font-bold mt-2 text-white">{activeAlerts.length}</p>
        </div>
        
        <div className="bg-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium text-green-100 uppercase tracking-wide">System Status</h3>
          <p className="text-4xl font-bold mt-2 text-white">Healthy</p>
        </div>
        
        <div className="bg-teal-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium text-teal-100 uppercase tracking-wide">Uptime</h3>
          <p className="text-4xl font-bold mt-2 text-white">
            {systemStats?.system?.uptime ? Math.floor(systemStats.system.uptime / 3600) : 0}h
          </p>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-blue-600 mb-4">Recent Alerts</h3>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <div>
                  <p className="font-semibold text-red-900">
                    Collision Alert: {alert.vessels.join(' - ')}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
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