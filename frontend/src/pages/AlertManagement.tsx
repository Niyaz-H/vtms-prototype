import { useState } from 'react'
import { useWebSocketStore } from '@/stores/websocketStore'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const AlertManagement: React.FC = () => {
  const { alerts } = useWebSocketStore()
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active')

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.resolved
    if (filter === 'resolved') return alert.resolved
    return true
  })

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-danger text-white'
      case 'danger': return 'bg-orange-500 text-white'
      case 'warning': return 'bg-warning text-white'
      case 'info': return 'bg-blue-500 text-white'
      default: return 'bg-secondary-500 text-white'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-secondary-900">Alert Management</h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'active' 
                ? 'bg-primary text-white' 
                : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            Active ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'resolved' 
                ? 'bg-primary text-white' 
                : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            Resolved ({alerts.filter(a => a.resolved).length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">
            No {filter !== 'all' ? filter : ''} alerts found
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-secondary-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {alert.resolved ? (
                        <CheckCircleIcon className="h-6 w-6 text-success" />
                      ) : (
                        <ExclamationTriangleIcon className="h-6 w-6 text-danger" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-secondary-900">
                          Collision Alert
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(alert.level)}`}>
                          {alert.level.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-secondary-700 mb-2">
                        Vessels: <span className="font-medium">{alert.vessels[0]}</span> and{' '}
                        <span className="font-medium">{alert.vessels[1]}</span>
                      </p>
                      
                      <div className="text-sm text-secondary-600">
                        <p>Detected: {new Date(alert.timestamp).toLocaleString()}</p>
                        {alert.resolved && alert.resolvedAt && (
                          <p>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertManagement