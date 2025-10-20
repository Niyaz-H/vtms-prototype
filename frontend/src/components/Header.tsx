import { 
  Bars3Icon, 
  BellIcon, 
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white border-b border-secondary-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-semibold text-secondary-900">
            Vessel Traffic Management System
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
          </button>
          <button className="p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100">
            <Cog6ToothIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header