import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VesselMap from '@/components/Map/VesselMap'
import { useWebSocketStore } from '@/stores/websocketStore'
import { usePageLoading } from '@/hooks/usePageLoading'
import type { Vessel } from '@/types/vessel'

const MapView: React.FC = () => {
  const navigate = useNavigate()
  const { vessels, alerts } = useWebSocketStore()
  const [selectedVesselId, setSelectedVesselId] = useState<number | undefined>()
  const loading = usePageLoading(1200)

  const handleVesselClick = (vessel: Vessel) => {
    setSelectedVesselId(vessel.mmsi)
    // Optionally navigate to vessel detail
    // navigate(`/vessels/${vessel.mmsi}`)
  }

  const activeAlerts = alerts.filter(a => !a.resolved)

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ top: '64px', bottom: '48px' }}>
        <div className="flex-none bg-white border-b border-slate-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="flex items-center gap-6">
              <div className="h-8 w-28 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative min-h-0 bg-slate-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600">Loading map...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ top: '64px', bottom: '48px' }}>
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-blue-600">Map View</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Vessels:</span>
              <span className="font-bold text-blue-600">{vessels.length}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
              <span className="text-sm text-red-700">Active Alerts:</span>
              <span className="font-bold text-red-600">{activeAlerts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <VesselMap
          className="absolute inset-0"
          onVesselClick={handleVesselClick}
          selectedVesselId={selectedVesselId}
        />
      </div>

      {/* Selected Vessel Info Panel */}
      {selectedVesselId && (
        <div className="absolute right-4 top-20 z-[1000] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {(() => {
            const vessel = vessels.find(v => v.mmsi === selectedVesselId)
            if (!vessel) return null

            return (
              <div>
                <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    {vessel.name || `Vessel ${vessel.mmsi}`}
                  </h3>
                  <button
                    onClick={() => setSelectedVesselId(undefined)}
                    className="text-white hover:text-blue-200 text-2xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">MMSI:</span>
                    <span className="font-semibold text-slate-900">{vessel.mmsi}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Speed:</span>
                    <span className="font-semibold text-slate-900">{vessel.speed?.toFixed(1) || 0} kn</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Course:</span>
                    <span className="font-semibold text-slate-900">{vessel.course?.toFixed(0) || 0}°</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Heading:</span>
                    <span className="font-semibold text-slate-900">{vessel.heading?.toFixed(0) || 0}°</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600 font-medium">Position:</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {vessel.position.latitude.toFixed(4)}, {vessel.position.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50">
                  <button
                    onClick={() => navigate(`/vessels/${vessel.mmsi}`)}
                    className="w-full px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-semibold transition-colors shadow-md"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default MapView