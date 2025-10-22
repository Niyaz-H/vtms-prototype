import { useEffect, useRef, useState, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useWebSocketStore } from '@/stores/websocketStore'
import type { Vessel } from '@/types/vessel'

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Create custom vessel icon
const createVesselIcon = (course: number = 0, alertLevel?: string) => {
  const color = alertLevel === 'critical' ? '#dc2626' 
    : alertLevel === 'danger' ? '#ea580c'
    : alertLevel === 'warning' ? '#eab308'
    : '#3b82f6'
  
  return L.divIcon({
    className: 'vessel-marker',
    html: `
      <div style="transform: rotate(${course}deg);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 12h4v8h8v-8h4L12 2z" stroke="white" stroke-width="1"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Component to update map view - memoized
const MapUpdater = memo<{ center: [number, number]; zoom: number }>(({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
})

MapUpdater.displayName = 'MapUpdater'

interface VesselMapProps {
  className?: string
  onVesselClick?: (vessel: Vessel) => void
  selectedVesselId?: number
}

const VesselMap = memo<VesselMapProps>(({
  className = '',
  onVesselClick,
  selectedVesselId
}) => {
  const { vessels, alerts } = useWebSocketStore()
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]) // New York default
  const [zoom, setZoom] = useState(10)
  const mapRef = useRef<L.Map>(null)

  // Memoize alert level lookup - prevents recalculation on every render
  const vesselAlertLevels = useMemo(() => {
    const alertMap = new Map<number, string>()
    
    alerts
      .filter(alert => !alert.resolved)
      .forEach(alert => {
        alert.vessels.forEach(vesselMmsi => {
          const mmsi = parseInt(vesselMmsi)
          const currentLevel = alertMap.get(mmsi)
          const newLevel = alert.level
          
          // Update only if new alert is more severe
          if (!currentLevel ||
              (newLevel === 'critical') ||
              (newLevel === 'danger' && currentLevel !== 'critical') ||
              (newLevel === 'warning' && !['critical', 'danger'].includes(currentLevel))) {
            alertMap.set(mmsi, newLevel)
          }
        })
      })
    
    return alertMap
  }, [alerts])

  // Update center when vessels are loaded
  useEffect(() => {
    if (vessels.length > 0 && !selectedVesselId) {
      const avgLat = vessels.reduce((sum, v) => sum + v.position.latitude, 0) / vessels.length
      const avgLon = vessels.reduce((sum, v) => sum + v.position.longitude, 0) / vessels.length
      setCenter([avgLat, avgLon])
    }
  }, [vessels, selectedVesselId])

  // Focus on selected vessel
  useEffect(() => {
    if (selectedVesselId) {
      const vessel = vessels.find(v => v.mmsi === selectedVesselId)
      if (vessel) {
        setCenter([vessel.position.latitude, vessel.position.longitude])
        setZoom(14)
      }
    }
  }, [selectedVesselId, vessels])

  // Memoize alert lines rendering
  const alertLines = useMemo(() => {
    return alerts
      .filter(alert => !alert.resolved)
      .map(alert => {
        const vessel1 = vessels.find(v => v.mmsi.toString() === alert.vessels[0])
        const vessel2 = vessels.find(v => v.mmsi.toString() === alert.vessels[1])
        
        if (!vessel1 || !vessel2) return null
        
        const color = alert.level === 'critical' ? '#dc2626'
          : alert.level === 'danger' ? '#ea580c'
          : alert.level === 'warning' ? '#eab308'
          : '#3b82f6'
        
        return (
          <Polyline
            key={alert.id}
            positions={[
              [vessel1.position.latitude, vessel1.position.longitude],
              [vessel2.position.latitude, vessel2.position.longitude]
            ]}
            pathOptions={{
              color,
              weight: 2,
              opacity: 0.6,
              dashArray: '5, 10'
            }}
          />
        )
      })
  }, [alerts, vessels])

  // Memoize vessel markers rendering
  const vesselMarkers = useMemo(() => {
    return vessels.map((vessel) => {
      const alertLevel = vesselAlertLevels.get(vessel.mmsi)
      
      return (
        <Marker
          key={vessel.mmsi}
          position={[vessel.position.latitude, vessel.position.longitude]}
          icon={createVesselIcon(vessel.course || 0, alertLevel)}
          eventHandlers={{
            click: () => onVesselClick?.(vessel)
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-lg mb-2">
                {vessel.name || `Vessel ${vessel.mmsi}`}
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>MMSI:</strong> {vessel.mmsi}</p>
                <p><strong>Speed:</strong> {vessel.speed?.toFixed(1) || 0} knots</p>
                <p><strong>Course:</strong> {vessel.course?.toFixed(0) || 0}°</p>
                <p><strong>Heading:</strong> {vessel.heading?.toFixed(0) || 0}°</p>
                {alertLevel && (
                  <p className="mt-2 text-danger font-semibold">
                    ⚠️ {alertLevel.toUpperCase()} ALERT
                  </p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      )
    })
  }, [vessels, vesselAlertLevels, onVesselClick])

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <MapUpdater center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render alert lines */}
        {alertLines}

        {/* Render vessel markers */}
        {vesselMarkers}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => setZoom(z => Math.min(z + 1, 18))}
          className="block w-full px-3 py-1 text-sm font-medium text-secondary-700 hover:bg-secondary-100 rounded"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 1, 1))}
          className="block w-full px-3 py-1 text-sm font-medium text-secondary-700 hover:bg-secondary-100 rounded"
        >
          −
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Danger</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Vessel Count */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm font-medium text-secondary-700">
          {vessels.length} Vessels
        </p>
      </div>
    </div>
  )
})

VesselMap.displayName = 'VesselMap'

export default VesselMap