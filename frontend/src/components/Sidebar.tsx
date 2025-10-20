import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  MapIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ChartBarIcon,
  XMarkIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: false },
    { name: 'Map View', href: '/map', icon: MapIcon, current: false },
    { name: 'Alerts', href: '/alerts', icon: ExclamationTriangleIcon, current: false },
    { name: 'System Monitor', href: '/system', icon: ComputerDesktopIcon, current: false },
    { name: 'Statistics', href: '/stats', icon: ChartBarIcon, current: false },
    { name: 'Simulation', href: '/simulation', icon: CogIcon, current: false },
  ]

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">VTMS</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${isActive
                  ? 'bg-primary text-white'
                  : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
                }
              `}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onClose()
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-200">
          <div className="text-xs text-secondary-500">
            Vessel Traffic Management System
          </div>
          <div className="text-xs text-secondary-400 mt-1">
            Version 1.0.0
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar