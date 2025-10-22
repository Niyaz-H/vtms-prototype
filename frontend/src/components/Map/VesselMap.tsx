import { useEffect, useRef, useState, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useWebSocketStore } from '@/stores/websocketStore'
import type { Vessel } from '@/types/vessel'

// Store vessel position history
const vesselHistoryMap = new Map<number, Array<{lat: number, lon: number, timestamp: number}>>()
const MAX_HISTORY_LENGTH = 10 // Keep last 10 positions

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

// Component to show coordinate grid
const CoordinateGrid = memo(() => {
  const map = useMap()
  
  useEffect(() => {
    // Create coordinate grid overlay
    const gridLayer = L.layerGroup()
    
    // Grid configuration for Caspian Sea
    const latMin = 38.5
    const latMax = 42
    const lonMin = 48.5
    const lonMax = 51.5
    const gridStep = 0.5 // Half degree steps
    
    // Draw latitude lines with labels
    for (let lat = latMin; lat <= latMax; lat += gridStep) {
      const latLine = L.polyline(
        [[lat, lonMin], [lat, lonMax]],
        { color: '#94a3b8', weight: 1, opacity: 0.3, dashArray: '5, 5' }
      )
      
      // Add latitude label
      const latLabel = L.marker([lat, lonMin + 0.1], {
        icon: L.divIcon({
          className: 'coordinate-label',
          html: `<div style="background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #1e293b; white-space: nowrap;">${lat.toFixed(1)}°N</div>`,
          iconSize: [60, 20],
          iconAnchor: [0, 10]
        })
      })
      
      gridLayer.addLayer(latLine)
      gridLayer.addLayer(latLabel)
    }
    
    // Draw longitude lines with labels
    for (let lon = lonMin; lon <= lonMax; lon += gridStep) {
      const lonLine = L.polyline(
        [[latMin, lon], [latMax, lon]],
        { color: '#94a3b8', weight: 1, opacity: 0.3, dashArray: '5, 5' }
      )
      
      // Add longitude label
      const lonLabel = L.marker([latMin + 0.1, lon], {
        icon: L.divIcon({
          className: 'coordinate-label',
          html: `<div style="background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #1e293b; white-space: nowrap;">${lon.toFixed(1)}°E</div>`,
          iconSize: [60, 20],
          iconAnchor: [0, 10]
        })
      })
      
      gridLayer.addLayer(lonLine)
      gridLayer.addLayer(lonLabel)
    }
    
    gridLayer.addTo(map)
    
    return () => {
      gridLayer.remove()
    }
  }, [map])
  
  return null
})

CoordinateGrid.displayName = 'CoordinateGrid'

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
  // Caspian Sea Azerbaijan border - center coordinates
  const [center, setCenter] = useState<[number, number]>([40.0, 49.0])
  const [zoom, setZoom] = useState(8)
  const [showTrajectories, setShowTrajectories] = useState(true)
  const mapRef = useRef<L.Map>(null)

  // Update vessel history
  useEffect(() => {
    vessels.forEach(vessel => {
      const history = vesselHistoryMap.get(vessel.mmsi) || []
      const newPoint = {
        lat: vessel.position.latitude,
        lon: vessel.position.longitude,
        timestamp: Date.now()
      }
      
      // Add new point and keep only recent history
      history.push(newPoint)
      if (history.length > MAX_HISTORY_LENGTH) {
        history.shift()
      }
      
      vesselHistoryMap.set(vessel.mmsi, history)
    })
  }, [vessels])

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

  // Calculate future position (trajectory prediction)
  const calculateFuturePosition = (vessel: Vessel, minutesAhead: number): [number, number] => {
    if (!vessel.speed || vessel.speed < 0.5) {
      return [vessel.position.latitude, vessel.position.longitude]
    }
    
    const distanceNM = (vessel.speed * minutesAhead) / 60
    const courseRad = (vessel.course || 0) * (Math.PI / 180)
    
    const latChange = (distanceNM / 60) * Math.cos(courseRad)
    const lonChange = (distanceNM / 60) * Math.sin(courseRad) / Math.cos(vessel.position.latitude * Math.PI / 180)
    
    return [
      vessel.position.latitude + latChange,
      vessel.position.longitude + lonChange
    ]
  }

  // Memoize trajectory lines
  const trajectoryLines = useMemo(() => {
    if (!showTrajectories) return []
    
    return vessels.flatMap(vessel => {
      const history = vesselHistoryMap.get(vessel.mmsi) || []
      if (history.length < 2) return []
      
      const alertLevel = vesselAlertLevels.get(vessel.mmsi)
      const color = alertLevel === 'critical' ? '#dc2626'
        : alertLevel === 'danger' ? '#ea580c'
        : alertLevel === 'warning' ? '#eab308'
        : '#3b82f6'
      
      const elements = []
      
      // Historical track
      elements.push(
        <Polyline
          key={`history-${vessel.mmsi}`}
          positions={history.map(h => [h.lat, h.lon])}
          pathOptions={{
            color,
            weight: 2,
            opacity: 0.4,
            dashArray: '2, 4'
          }}
        />
      )
      
      // Future trajectory
      const futurePositions = [
        [vessel.position.latitude, vessel.position.longitude] as [number, number],
        calculateFuturePosition(vessel, 5),
        calculateFuturePosition(vessel, 10),
        calculateFuturePosition(vessel, 15)
      ]
      
      elements.push(
        <Polyline
          key={`future-${vessel.mmsi}`}
          positions={futurePositions}
          pathOptions={{
            color,
            weight: 2,
            opacity: 0.6,
            dashArray: '10, 5'
          }}
        />
      )
      
      // Prediction markers
      ;[5, 10, 15].forEach((minutes, idx) => {
        const pos = calculateFuturePosition(vessel, minutes)
        elements.push(
          <CircleMarker
            key={`pred-${vessel.mmsi}-${minutes}`}
            center={pos}
            radius={3}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.6 - (idx * 0.15),
              color: 'white',
              weight: 1
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{vessel.name}</p>
                <p>Predicted position in {minutes} min</p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })
      
      return elements
    })
  }, [vessels, vesselAlertLevels, showTrajectories])

  // Memoize collision points
  const collisionPoints = useMemo(() => {
    return alerts
      .filter(alert => !alert.resolved && alert.predictedCollisionPoint)
      .map(alert => {
        const cp = alert.predictedCollisionPoint!
        return (
          <CircleMarker
            key={`collision-${alert.id}`}
            center={[cp.latitude, cp.longitude]}
            radius={8}
            pathOptions={{
              fillColor: '#dc2626',
              fillOpacity: 0.8,
              color: '#ffffff',
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-red-600">⚠️ Collision Risk</p>
                <p>Level: {alert.level.toUpperCase()}</p>
                <p>Distance: {alert.proximity.distance.toFixed(2)} NM</p>
                {alert.proximity.tcpa && (
                  <p>TCPA: {alert.proximity.tcpa.toFixed(1)} min</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })
  }, [alerts])

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
                <p><strong>Position:</strong> {vessel.position.latitude.toFixed(4)}°N, {vessel.position.longitude.toFixed(4)}°E</p>
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
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        ref={mapRef}
      >
        <MapUpdater center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Coordinate Grid Overlay */}
        <CoordinateGrid />

        {/* Render trajectory lines and predictions */}
        {trajectoryLines}

        {/* Render collision points */}
        {collisionPoints}

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
        <button
          onClick={() => setShowTrajectories(!showTrajectories)}
          className={`block w-full px-3 py-1 text-xs font-medium rounded ${
            showTrajectories
              ? 'bg-primary-500 text-white'
              : 'text-secondary-700 hover:bg-secondary-100'
          }`}
          title="Toggle vessel trajectories"
        >
          📍
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