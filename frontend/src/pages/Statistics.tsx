import { useWebSocketStore } from '@/stores/websocketStore'
import { usePageLoading } from '@/hooks/usePageLoading'
import { DashboardCardSkeleton } from '@/components/LoadingSkeleton'

const Statistics: React.FC = () => {
  const { vessels, alerts } = useWebSocketStore()
  const loading = usePageLoading()

  const stats = {
    totalVessels: vessels.length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    resolvedAlerts: alerts.filter(a => a.resolved).length,
    averageSpeed: vessels.length > 0 
      ? (vessels.reduce((sum, v) => sum + (v.speed || 0), 0) / vessels.length).toFixed(2)
      : '0.00',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-6 w-64 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-blue-600">Statistics</h2>
        <div className="text-sm text-slate-600">
          System statistics and analytics
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Vessels</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.totalVessels}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Active Alerts</h3>
          <p className="text-4xl font-bold text-red-600 mt-2">{stats.activeAlerts}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Resolved Alerts</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">{stats.resolvedAlerts}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Avg Speed</h3>
          <p className="text-4xl font-bold text-teal-600 mt-2">{stats.averageSpeed} <span className="text-lg">kn</span></p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Vessel Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Total Tracked Vessels</span>
              <span className="font-bold text-slate-900">{stats.totalVessels}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Average Speed</span>
              <span className="font-bold text-slate-900">{stats.averageSpeed} knots</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Vessels in Motion</span>
              <span className="font-bold text-slate-900">
                {vessels.filter(v => (v.speed || 0) > 0).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Alert Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Total Alerts</span>
              <span className="font-bold text-slate-900">{alerts.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Active Alerts</span>
              <span className="font-bold text-red-600">{stats.activeAlerts}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Resolved Alerts</span>
              <span className="font-bold text-green-600">{stats.resolvedAlerts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Levels Breakdown */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-blue-600 mb-4">Alert Levels Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['info', 'warning', 'danger', 'critical'].map((level) => {
            const count = alerts.filter(a => a.level === level && !a.resolved).length
            const color = level === 'critical' ? 'red' 
              : level === 'danger' ? 'orange'
              : level === 'warning' ? 'yellow'
              : 'blue'
            
            return (
              <div key={level} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
                <div className={`text-${color}-600 text-sm font-medium uppercase mb-1`}>
                  {level}
                </div>
                <div className={`text-3xl font-bold text-${color}-700`}>
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Statistics