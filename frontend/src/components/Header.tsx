import { useState } from 'react'
import { Bars3Icon, BellIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useWebSocketStore } from '@/stores/websocketStore'
import toast from 'react-hot-toast'

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { connected, alerts } = useWebSocketStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const activeAlerts = alerts.filter(a => !a.resolved)

  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications)
    setShowSettings(false)
  }

  const handleSettingsClick = () => {
    setShowSettings(!showSettings)
    setShowNotifications(false)
  }

  return (
    <header className="bg-white border-b border-border shadow-sm px-6 py-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-xl lg:text-2xl font-bold text-blue-600">
            Vessel Traffic Management System
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
            connected
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Action Buttons */}
          <div className="relative">
            <button
              onClick={handleNotificationsClick}
              className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors relative z-10"
              aria-label="Notifications"
            >
              <BellIcon className="h-6 w-6" />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
                  {activeAlerts.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">No active notifications</p>
                  ) : (
                    <div className="space-y-2">
                      {activeAlerts.slice(0, 5).map(alert => (
                        <div key={alert.id} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                          <p className="font-medium text-red-900">Collision Alert</p>
                          <p className="text-red-700 text-xs mt-1">{alert.vessels.join(' - ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={handleSettingsClick}
              className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors z-10"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { toast.success('Profile settings opened'); setShowSettings(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => { toast.success('Preferences opened'); setShowSettings(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Preferences
                  </button>
                  <button
                    onClick={() => { toast.success('Display settings opened'); setShowSettings(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Display
                  </button>
                  <div className="border-t border-slate-200 my-2"></div>
                  <button
                    onClick={() => { toast('Logging out...', { icon: '👋' }); setShowSettings(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header