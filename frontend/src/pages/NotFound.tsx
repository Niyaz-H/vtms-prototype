import { useNavigate } from 'react-router-dom'
import { HomeIcon } from '@heroicons/react/24/outline'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-secondary-300">404</h1>
        <h2 className="text-3xl font-semibold text-secondary-900 mt-4">Page Not Found</h2>
        <p className="text-secondary-600 mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          <HomeIcon className="h-5 w-5" />
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default NotFound