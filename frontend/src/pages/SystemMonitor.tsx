import { useWebSocketStore } from '@/stores/websocketStore'
import { CpuChipIcon, ServerIcon, ClockIcon, SignalIcon } from '@heroicons/react/24/outline'

const SystemMonitor: React.FC = () => {
  const { systemStats } = useWebSocketStore()

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-secondary-900">System Monitor</h2>

      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <ClockIcon className="h-6 w-6 text-primary" />
            <h3 className="text-sm font-medium text-secondary-500">Uptime</h3>
          </div>
          <p className="text-2xl font-bold text-secondary-900">
            {systemStats?.system?.uptime ? formatUptime(systemStats.system.uptime) : '0h 0m'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <SignalIcon className="h-6 w-6 text-success" />
            <h3 className="text-sm font-medium text-secondary-500">Messages Processed</h3>
          </div>
          <p className="text-2xl font-bold text-secondary-900">
            {systemStats?.system?.messagesProcessed?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CpuChipIcon className="h-6 w-6 text-warning" />
            <h3 className="text-sm font-medium text-secondary-500">CPU Usage</h3>
          </div>
          <p className="text-2xl font-bold text-secondary-900">
            {systemStats?.system?.cpuUsage?.toFixed(1) || 0}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <ServerIcon className="h-6 w-6 text-info" />
            <h3 className="text-sm font-medium text-secondary-500">Memory Usage</h3>
          </div>
          <p className="text-2xl font-bold text-secondary-900">
            {systemStats?.system?.memoryUsage?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Vessel Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Vessel Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-secondary-500">Total Vessels</p>
            <p className="text-3xl font-bold text-secondary-900 mt-1">
              {systemStats?.vessels?.total || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Active Vessels</p>
            <p className="text-3xl font-bold text-success mt-1">
              {systemStats?.vessels?.active || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Updated (Last Hour)</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {systemStats?.vessels?.updatedLastHour || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Alert Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-secondary-500">Total Alerts</p>
            <p className="text-3xl font-bold text-secondary-900 mt-1">
              {systemStats?.alerts?.total || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Active Alerts</p>
            <p className="text-3xl font-bold text-danger mt-1">
              {systemStats?.alerts?.active || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Simulation Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Simulation Status</h3>
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${
            systemStats?.simulation?.running ? 'bg-success' : 'bg-secondary-400'
          }`} />
          <span className="text-secondary-900 font-medium">
            {systemStats?.simulation?.running ? 'Running' : 'Stopped'}
          </span>
          <span className="text-secondary-600">
            ({systemStats?.simulation?.vesselCount || 0} simulated vessels)
          </span>
        </div>
      </div>
    </div>
  )
}

export default SystemMonitor