import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useWebSocketStore } from '@/stores/websocketStore'

const VesselDetail: React.FC = () => {
  const { mmsi } = useParams<{ mmsi: string }>()
  const navigate = useNavigate()
  const { vessels } = useWebSocketStore()
  const [vessel, setVessel] = useState<any>(null)

  useEffect(() => {
    const found = vessels.find(v => v.mmsi.toString() === mmsi)
    setVessel(found)
  }, [vessels, mmsi])

  if (!vessel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-secondary-500">Vessel not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-3xl font-bold text-secondary-900">
          Vessel Details - {vessel.name || vessel.mmsi}
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Basic Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-secondary-500">MMSI</dt>
                <dd className="text-base text-secondary-900">{vessel.mmsi}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Name</dt>
                <dd className="text-base text-secondary-900">{vessel.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Status</dt>
                <dd className="text-base text-secondary-900">{vessel.status || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Position & Navigation</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-secondary-500">Latitude</dt>
                <dd className="text-base text-secondary-900">{vessel.position.latitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Longitude</dt>
                <dd className="text-base text-secondary-900">{vessel.position.longitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Speed</dt>
                <dd className="text-base text-secondary-900">{vessel.speed || 0} knots</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Course</dt>
                <dd className="text-base text-secondary-900">{vessel.course || 0}°</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-secondary-500">Heading</dt>
                <dd className="text-base text-secondary-900">{vessel.heading || 0}°</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VesselDetail