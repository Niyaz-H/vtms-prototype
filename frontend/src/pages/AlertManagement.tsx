import { useState } from 'react'
import { useSuspiciousActivities, useAlerts } from '@/stores/websocketStore'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'
import {
  AlertState,
  getActivityTypeLabel,
  getActivityTypeIcon,
  getAlertStateLabel,
  getAlertStateColor,
  getSeverityColor
} from '@/types/activity'

type FilterType = 'all' | 'new' | 'acknowledged' | 'investigating' | 'resolved'
type AlertTab = 'suspicious' | 'collision'

const AlertManagement: React.FC = () => {
  const suspiciousActivities = useSuspiciousActivities()
  const collisionAlerts = useAlerts()
  const [filter, setFilter] = useState<FilterType>('all')
  const [activeTab, setActiveTab] = useState<AlertTab>('suspicious')

  // Filter suspicious activities
  const filteredActivities = suspiciousActivities.filter(activity => {
    if (filter === 'all') return true
    return activity.state === filter
  })

  // Filter collision alerts
  const filteredCollisionAlerts = collisionAlerts.filter(alert => {
    if (filter === 'all') return true
    if (filter === 'new') return !alert.resolved
    if (filter === 'resolved') return alert.resolved
    return true
  })

  // Mock action handlers (would connect to backend API)
  const handleAcknowledge = async (activityId: string) => {
    console.log('Acknowledging activity:', activityId)
    // TODO: Call API to acknowledge activity
  }

  const handleInvestigate = async (activityId: string) => {
    console.log('Starting investigation for activity:', activityId)
    // TODO: Call API to start investigation
  }

  const handleResolve = async (activityId: string) => {
    console.log('Resolving activity:', activityId)
    // TODO: Call API to resolve activity
  }

  const handleEscalate = async (activityId: string) => {
    console.log('Escalating activity:', activityId)
    // TODO: Call API to escalate activity
  }


  const getStateCount = (state: FilterType) => {
    if (activeTab === 'suspicious') {
      if (state === 'all') return suspiciousActivities.length
      return suspiciousActivities.filter(a => a.state === state).length
    } else {
      if (state === 'all') return collisionAlerts.length
      if (state === 'new') return collisionAlerts.filter(a => !a.resolved).length
      if (state === 'resolved') return collisionAlerts.filter(a => a.resolved).length
      return 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-secondary-900">Alert Management</h2>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suspicious'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            🔍 Suspicious Activities ({suspiciousActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('collision')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'collision'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            ⚠️ Collision Alerts ({collisionAlerts.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all' 
              ? 'bg-primary text-white' 
              : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
          }`}
        >
          All ({getStateCount('all')})
        </button>
        {activeTab === 'suspicious' ? (
          <>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'new' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              New ({getStateCount('new')})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'acknowledged' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              Acknowledged ({getStateCount('acknowledged')})
            </button>
            <button
              onClick={() => setFilter('investigating')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'investigating' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              Investigating ({getStateCount('investigating')})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'resolved' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              Resolved ({getStateCount('resolved')})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'new' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              Active ({getStateCount('new')})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'resolved' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-50'
              }`}
            >
              Resolved ({getStateCount('resolved')})
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'suspicious' ? (
        <div className="bg-white rounded-lg shadow">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-secondary-500">
              No {filter !== 'all' ? filter : ''} suspicious activities found
            </div>
          ) : (
            <div className="divide-y divide-secondary-200">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-6 hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1 text-3xl">
                        {getActivityTypeIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-secondary-900">
                            {getActivityTypeLabel(activity.type)}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                            {activity.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAlertStateColor(activity.state)}`}>
                            {getAlertStateLabel(activity.state)}
                          </span>
                        </div>
                        
                        <p className="text-secondary-700 mb-2">
                          {activity.evidence.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-secondary-600 mb-3">
                          <span>🚢 Vessels: {activity.vessels.join(', ')}</span>
                          <span>📍 Location: {activity.location.latitude.toFixed(4)}, {activity.location.longitude.toFixed(4)}</span>
                          <span>🕐 {new Date(activity.detectedAt).toLocaleString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {activity.state === AlertState.NEW && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAcknowledge(activity.id)
                              }}
                              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              Acknowledge
                            </button>
                          )}
                          {activity.state === AlertState.ACKNOWLEDGED && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleInvestigate(activity.id)
                              }}
                              className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center gap-1"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Investigate
                            </button>
                          )}
                          {(activity.state === AlertState.INVESTIGATING || activity.state === AlertState.ACKNOWLEDGED) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResolve(activity.id)
                              }}
                              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-1"
                            >
                              <ShieldCheckIcon className="h-4 w-4" />
                              Resolve
                            </button>
                          )}
                          {activity.state !== AlertState.RESOLVED && activity.state !== AlertState.ESCALATED && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEscalate(activity.id)
                              }}
                              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-1"
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                              Escalate
                            </button>
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
      ) : (
        <div className="bg-white rounded-lg shadow">
          {filteredCollisionAlerts.length === 0 ? (
            <div className="p-8 text-center text-secondary-500">
              No {filter !== 'all' ? filter : ''} collision alerts found
            </div>
          ) : (
            <div className="divide-y divide-secondary-200">
              {filteredCollisionAlerts.map((alert) => (
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
                            Collision Risk Alert
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            alert.level === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
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
      )}
    </div>
  )
}

export default AlertManagement