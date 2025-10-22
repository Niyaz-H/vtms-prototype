import { NavLink } from 'react-router-dom'
import { HomeIcon, MapIcon, ExclamationTriangleIcon, CogIcon, ChartBarIcon, XMarkIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

// Route preloading helpers
const preloadRouteModules: Record<string, () => Promise<any>> = {
  '/system': () => import('@/pages/SystemMonitor'),
  '/stats': () => import('@/pages/Statistics'),
  '/simulation': () => import('@/pages/SimulationControl'),
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

  const handleMouseEnter = (href: string) => {
    // Preload route module on hover for instant navigation
    const preloader = preloadRouteModules[href]
    if (preloader) {
      preloader().catch(() => {})
    }
  }

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
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 shadow-xl transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">VTMS</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onMouseEnter={() => handleMouseEnter(item.href)}
              onFocus={() => handleMouseEnter(item.href)}
              className={({ isActive }) => `
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onClose()
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400 font-medium">
            Vessel Traffic Management System
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Version 1.0.0
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar