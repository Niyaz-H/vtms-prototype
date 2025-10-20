import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VesselMap from '@/components/Map/VesselMap'
import { useWebSocketStore } from '@/stores/websocketStore'
import type { Vessel } from '@/types/vessel'

const MapView: React.FC = () => {
  const navigate = useNavigate()
  const { vessels, alerts } = useWebSocketStore()
  const [selectedVesselId, setSelectedVesselId] = useState<number | undefined>()

  const handleVesselClick = (vessel: Vessel) => {
    setSelectedVesselId(vessel.mmsi)
    // Optionally navigate to vessel detail
    // navigate(`/vessels/${vessel.mmsi}`)
  }

  const activeAlerts = alerts.filter(a => !a.resolved)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none bg-white border-b border-secondary-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-secondary-900">Map View</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-secondary-600">Vessels:</span>{' '}
              <span className="font-semibold text-secondary-900">{vessels.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-secondary-600">Active Alerts:</span>{' '}
              <span className="font-semibold text-danger">{activeAlerts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <VesselMap
          className="h-full w-full"
          onVesselClick={handleVesselClick}
          selectedVesselId={selectedVesselId}
        />
      </div>

      {/* Selected Vessel Info Panel */}
      {selectedVesselId && (
        <div className="absolute right-4 top-20 z-[1000] w-80 bg-white rounded-lg shadow-xl p-4">
          {(() => {
            const vessel = vessels.find(v => v.mmsi === selectedVesselId)
            if (!vessel) return null

            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">
                    {vessel.name || `Vessel ${vessel.mmsi}`}
                  </h3>
                  <button
                    onClick={() => setSelectedVesselId(undefined)}
                    className="text-secondary-400 hover:text-secondary-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">MMSI:</span>
                    <span className="font-medium">{vessel.mmsi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Speed:</span>
                    <span className="font-medium">{vessel.speed?.toFixed(1) || 0} kn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Course:</span>
                    <span className="font-medium">{vessel.course?.toFixed(0) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Heading:</span>
                    <span className="font-medium">{vessel.heading?.toFixed(0) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Position:</span>
                    <span className="font-medium text-xs">
                      {vessel.position.latitude.toFixed(4)}, {vessel.position.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/vessels/${vessel.mmsi}`)}
                  className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default MapView