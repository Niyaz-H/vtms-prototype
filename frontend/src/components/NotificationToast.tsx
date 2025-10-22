import { useEffect, useState } from 'react'
import { usePendingActivities } from '@/stores/websocketStore'
import { getActivityTypeLabel, getActivityTypeIcon, getSeverityColor } from '@/types/activity'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Toast {
  id: string
  message: string
  type: string
  severity: string
  icon: string
  timestamp: Date
}

const NotificationToast: React.FC = () => {
  const pendingActivities = usePendingActivities()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [prevActivityCount, setPrevActivityCount] = useState(0)

  useEffect(() => {
    // Detect new activities
    if (pendingActivities.length > prevActivityCount) {
      const newActivities = pendingActivities.slice(prevActivityCount)
      const newToasts = newActivities.map(activity => ({
        id: activity.id,
        message: `${getActivityTypeLabel(activity.type)} detected involving vessels: ${activity.vessels.join(', ')}`,
        type: getActivityTypeLabel(activity.type),
        severity: activity.severity,
        icon: getActivityTypeIcon(activity.type),
        timestamp: new Date()
      }))
      
      setToasts(prev => [...prev, ...newToasts])
      
      // Auto-remove toasts after 10 seconds
      newToasts.forEach(toast => {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 10000)
      })
    }
    
    setPrevActivityCount(pendingActivities.length)
  }, [pendingActivities, prevActivityCount])

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-white rounded-lg shadow-lg border-l-4 p-4 flex items-start gap-3 animate-slide-in ${
            toast.severity === 'critical' ? 'border-red-500' :
            toast.severity === 'high' ? 'border-orange-500' :
            toast.severity === 'medium' ? 'border-yellow-500' :
            'border-blue-500'
          }`}
        >
          <div className="text-2xl flex-shrink-0">{toast.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-secondary-900">{toast.type}</h4>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(toast.severity)}`}>
                {toast.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-secondary-700">{toast.message}</p>
            <p className="text-xs text-secondary-500 mt-1">
              {toast.timestamp.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 text-secondary-400 hover:text-secondary-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default NotificationToast