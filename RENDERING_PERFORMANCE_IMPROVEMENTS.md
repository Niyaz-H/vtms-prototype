# Rendering Performance Improvements Strategy

## Overview

This strategy focuses on optimizing the VTMS frontend rendering performance to achieve smooth 60fps interactions, reduce unnecessary re-renders, and handle large datasets efficiently, particularly for the real-time vessel tracking system.

## Current Rendering Issues Analysis

### Identified Performance Bottlenecks

#### 1. VesselMap Component Issues
```typescript
// Current VesselMap.tsx - Performance issues
const VesselMap = () => {
  const { vessels, alerts } = useWebSocketStore()
  
  // ❌ Re-renders on every vessel/alert update
  const getVesselAlertLevel = (mmsi: number) => {
    // ❌ Computed on every render
    return alerts.filter(alert => 
      !alert.resolved && (alert.vessels[0] === mmsi.toString() || alert.vessels[1] === mmsi.toString())
    )
  }
  
  // ❌ All markers re-render on any position change
  return vessels.map((vessel) => (
    <Marker key={vessel.mmsi} position={[vessel.position.latitude, vessel.position.longitude]} />
  ))
}
```

#### 2. State Management Issues
```typescript
// Current websocketStore.ts - Inefficient updates
export const useWebSocketStore = create((set) => ({
  vessels: [],
  
  // ❌ Triggers re-renders for all subscribers
  updateVessel: (vessel) => set((state) => ({
    vessels: state.vessels.map(v => v.mmsi === vessel.mmsi ? vessel : v)
  })),
  
  // ❌ No batching for rapid updates
  updateVessels: (vessels) => set({ vessels }),
}))
```

#### 3. Animation and Transition Issues
```typescript
// Current animations - Blocking main thread
const AnimatedCard = motion.div({
  animate: { scale: 1.1 },
  transition: { duration: 0.3 } // ❌ Synchronous animation
})
```

## Optimization Strategies

### 1. React Component Optimization

#### Memoization Strategy
```typescript
// src/components/Map/VesselMarker.tsx - Optimized marker component
import React, { memo, useMemo, useCallback } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { createVesselIcon } from '@/utils/mapIcons'

interface VesselMarkerProps {
  vessel: Vessel
  alertLevel?: string
  onClick: (vessel: Vessel) => void
  isSelected: boolean
}

const VesselMarker = memo(({ vessel, alertLevel, onClick, isSelected }: VesselMarkerProps) => {
  // Memoize icon creation to avoid recreating on each render
  const icon = useMemo(() => 
    createVesselIcon(vessel.course || 0, alertLevel), 
    [vessel.course, alertLevel]
  )
  
  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick(vessel)
  }, [vessel, onClick])
  
  // Memoize popup content
  const popupContent = useMemo(() => (
    <div className="p-2">
      <h3 className="font-semibold text-lg mb-2">
        {vessel.name || `Vessel ${vessel.mmsi}`}
      </h3>
      <div className="space-y-1 text-sm">
        <p><strong>MMSI:</strong> {vessel.mmsi}</p>
        <p><strong>Speed:</strong> {vessel.speed?.toFixed(1) || 0} knots</p>
        <p><strong>Course:</strong> {vessel.course?.toFixed(0) || 0}°</p>
      </div>
    </div>
  ), [vessel])
  
  return (
    <Marker
      position={[vessel.position.latitude, vessel.position.longitude]}
      icon={icon}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>{popupContent}</Popup>
    </Marker>
  )
})

VesselMarker.displayName = 'VesselMarker'
export default VesselMarker
```

#### Optimized VesselMap Component
```typescript
// src/components/Map/VesselMap.tsx - Optimized map component
import React, { useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
import { useWebSocketStore } from '@/stores/websocketStore'
import VesselMarker from './VesselMarker'

interface VesselMapProps {
  className?: string
  onVesselClick?: (vessel: Vessel) => void
  selectedVesselId?: number
}

const VesselMap = React.memo<VesselMapProps>(({ 
  className, 
  onVesselClick,
  selectedVesselId 
}) => {
  const { vessels, alerts } = useWebSocketStore(
    // ❌ Selective subscription - only subscribe to needed data
    useCallback((state) => ({
      vessels: state.vessels,
      alerts: state.alerts
    }), [])
  )
  
  // Memoize alert level lookup to avoid recalculating
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
  
  // Memoize vessel markers rendering with virtualization
  const vesselMarkers = useMemo(() => {
    return vessels.map((vessel) => (
      <VesselMarker
        key={vessel.mmsi}
        vessel={vessel}
        alertLevel={vesselAlertLevels.get(vessel.mmsi)}
        onClick={onVesselClick || (() => {})}
        isSelected={selectedVesselId === vessel.mmsi}
      />
    ))
  }, [vessels, vesselAlertLevels, onVesselClick, selectedVesselId])
  
  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {alertLines}
        {vesselMarkers}
      </MapContainer>
    </div>
  )
})

VesselMap.displayName = 'VesselMap'
export default VesselMap
```

### 2. State Management Optimization

#### Optimized Zustand Store
```typescript
// src/stores/websocketStore.ts - Optimized store
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface VesselState {
  vessels: Record<number, Vessel> // Use object for O(1) lookups
  vesselOrder: number[] // Maintain order for UI
  alerts: CollisionAlert[]
  lastUpdate: number
}

interface VesselActions {
  // Batch updates for performance
  batchUpdateVessels: (vessels: Vessel[]) => void
  updateSingleVessel: (vessel: Vessel) => void
  // Selective updates
  updateVesselPosition: (mmsi: number, position: Position) => void
  // Computed selectors
  getVesselCount: () => number
  getActiveAlerts: () => CollisionAlert[]
}

export const useWebSocketStore = create<VesselState & VesselActions>()(
  subscribeWithSelector((set, get) => ({
    vessels: {},
    vesselOrder: [],
    alerts: [],
    lastUpdate: Date.now(),
    
    // Batch multiple vessel updates
    batchUpdateVessels: (vessels) => set((state) => {
      const newVessels = { ...state.vessels }
      const newOrder = [...state.vesselOrder]
      
      vessels.forEach(vessel => {
        if (!newVessels[vessel.mmsi]) {
          newOrder.push(vessel.mmsi)
        }
        newVessels[vessel.mmsi] = vessel
      })
      
      return {
        vessels: newVessels,
        vesselOrder: newOrder,
        lastUpdate: Date.now()
      }
    }),
    
    // Optimized single vessel update
    updateSingleVessel: (vessel) => set((state) => ({
      vessels: {
        ...state.vessels,
        [vessel.mmsi]: vessel
      },
      lastUpdate: Date.now()
    })),
    
    // Selective position update (most common operation)
    updateVesselPosition: (mmsi, position) => set((state) => {
      const vessel = state.vessels[mmsi]
      if (!vessel) return state
      
      return {
        vessels: {
          ...state.vessels,
          [mmsi]: {
            ...vessel,
            position,
            lastUpdate: Date.now()
          }
        },
        lastUpdate: Date.now()
      }
    }),
    
    // Computed selectors
    getVesselCount: () => Object.keys(get().vessels).length,
    
    getActiveAlerts: () => get().alerts.filter(alert => !alert.resolved)
  }))
)

// Selective hooks for components
export const useVessels = () => useWebSocketStore(state => state.vessels)
export const useVesselCount = () => useWebSocketStore(state => state.getVesselCount())
export const useActiveAlerts = () => useWebSocketStore(state => state.getActiveAlerts())
```

### 3. Virtualization for Large Datasets

#### Vessel List Virtualization
```typescript
// src/components/Vessel/VirtualVesselList.tsx
import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualVesselListProps {
  vessels: Vessel[]
  onVesselClick: (vessel: Vessel) => void
  height: number
  itemHeight: number
}

const VesselItem = React.memo(({ index, style, data }: any) => {
  const vessel = data.vessels[index]
  
  return (
    <div style={style} className="border-b border-gray-200 p-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{vessel.name || `Vessel ${vessel.mmsi}`}</span>
        <span className="text-sm text-gray-500">{vessel.speed?.toFixed(1)} knots</span>
      </div>
    </div>
  )
})

const VirtualVesselList: React.FC<VirtualVesselListProps> = ({
  vessels,
  onVesselClick,
  height,
  itemHeight = 60
}) => {
  const itemData = useMemo(() => ({ vessels, onVesselClick }), [vessels, onVesselClick])
  
  return (
    <List
      height={height}
      itemCount={vessels.length}
      itemSize={itemHeight}
      itemData={itemData}
    >
      {VesselItem}
    </List>
  )
}

export default VirtualVesselList
```

### 4. Map Performance Optimization

#### Viewport Culling
```typescript
// src/hooks/useViewportCulling.ts
import { useMemo } from 'react'
import { useMap } from 'react-leaflet'

export const useViewportCulling = (vessels: Vessel[], buffer = 0.1) => {
  const map = useMap()
  
  return useMemo(() => {
    if (!map) return vessels
    
    const bounds = map.getBounds()
    const filteredVessels = vessels.filter(vessel => {
      const lat = vessel.position.latitude
      const lng = vessel.position.longitude
      
      return lat >= bounds.getSouth() - buffer &&
             lat <= bounds.getNorth() + buffer &&
             lng >= bounds.getWest() - buffer &&
             lng <= bounds.getEast() + buffer
    })
    
    return filteredVessels
  }, [vessels, map, buffer])
}
```

#### Vessel Clustering
```typescript
// src/components/Map/VesselCluster.tsx
import React, { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

interface ClusterMarker {
  position: [number, number]
  vessels: Vessel[]
  count: number
}

const VesselCluster: React.FC<{ vessels: Vessel[], zoom: number }> = ({ vessels, zoom }) => {
  const clusters = useMemo(() => {
    if (zoom > 12) return vessels.map(v => ({
      position: [v.position.latitude, v.position.longitude],
      vessels: [v],
      count: 1
    }))
    
    // Simple clustering algorithm
    const clusters: ClusterMarker[] = []
    const processed = new Set<number>()
    
    vessels.forEach(vessel => {
      if (processed.has(vessel.mmsi)) return
      
      const nearbyVessels = vessels.filter(v => {
        if (processed.has(v.mmsi)) return false
        
        const distance = Math.sqrt(
          Math.pow(vessel.position.latitude - v.position.latitude, 2) +
          Math.pow(vessel.position.longitude - v.position.longitude, 2)
        )
        
        return distance < 0.01 // ~1km at equator
      })
      
      nearbyVessels.forEach(v => processed.add(v.mmsi))
      
      const centerLat = nearbyVessels.reduce((sum, v) => sum + v.position.latitude, 0) / nearbyVessels.length
      const centerLng = nearbyVessels.reduce((sum, v) => sum + v.position.longitude, 0) / nearbyVessels.length
      
      clusters.push({
        position: [centerLat, centerLng],
        vessels: nearbyVessels,
        count: nearbyVessels.length
      })
    })
    
    return clusters
  }, [vessels, zoom])
  
  return (
    <>
      {clusters.map((cluster, index) => (
        <Marker
          key={`cluster-${index}`}
          position={cluster.position}
          icon={L.divIcon({
            className: 'vessel-cluster',
            html: `
              <div class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                ${cluster.count}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        >
          <Popup>
            <div>
              <p className="font-semibold">{cluster.count} vessels</p>
              <div className="max-h-32 overflow-y-auto">
                {cluster.vessels.map(v => (
                  <p key={v.mmsi} className="text-sm">{v.name || v.mmsi}</p>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

export default VesselCluster
```

### 5. Animation Optimization

#### CSS-based Animations
```typescript
// src/components/Animations/OptimizedAnimations.tsx
import React from 'react'
import './OptimizedAnimations.css'

interface OptimizedAnimationProps {
  children: React.ReactNode
  trigger: boolean
}

const OptimizedAnimation: React.FC<OptimizedAnimationProps> = ({ children, trigger }) => {
  return (
    <div className={`optimized-animation ${trigger ? 'animate' : ''}`}>
      {children}
    </div>
  )
}

export default OptimizedAnimation
```

```css
/* src/components/Animations/OptimizedAnimations.css */
.optimized-animation {
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Hint for browser */
  transition: transform 0.3s ease-out;
}

.optimized-animation.animate {
  transform: scale(1.05) translateY(-2px);
}

/* Use CSS animations instead of JavaScript */
@keyframes pulse-optimized {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse-optimized {
  animation: pulse-optimized 2s infinite;
  transform: translateZ(0); /* Hardware acceleration */
}
```

### 6. Performance Monitoring

#### Render Performance Tracker
```typescript
// src/utils/performanceTracker.ts
export class PerformanceTracker {
  private static instance: PerformanceTracker
  private observers: PerformanceObserver[] = []
  
  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker()
    }
    return PerformanceTracker.instance
  }
  
  startTracking() {
    // Track long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(`Long task detected: ${entry.duration}ms`)
        }
      }
    })
    
    longTaskObserver.observe({ entryTypes: ['longtask'] })
    this.observers.push(longTaskObserver)
    
    // Track render performance
    const renderObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('render')) {
          console.log(`Render time: ${entry.duration}ms`)
        }
      }
    })
    
    renderObserver.observe({ entryTypes: ['measure'] })
    this.observers.push(renderObserver)
  }
  
  stopTracking() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
  
  measureRender(componentName: string, fn: () => void) {
    const start = performance.now()
    fn()
    const end = performance.now()
    
    if (end - start > 16) { // Longer than one frame at 60fps
      console.warn(`${componentName} render took ${end - start}ms`)
    }
  }
}
```

## Implementation Plan

### Phase 1: Component Optimization (Week 1)
1. **Implement memoization for VesselMarker component**
2. **Optimize VesselMap with selective subscriptions**
3. **Add performance monitoring**

### Phase 2: State Management (Week 2)
1. **Optimize Zustand store with batched updates**
2. **Implement selective hooks**
3. **Add computed selectors**

### Phase 3: Advanced Optimizations (Week 3-4)
1. **Implement viewport culling**
2. **Add vessel clustering**
3. **Implement virtualization for large lists**

### Phase 4: Animation and Monitoring (Week 5)
1. **Replace JavaScript animations with CSS**
2. **Implement comprehensive performance monitoring**
3. **Performance testing and optimization**

## Expected Results

### Performance Improvements
- **Render Time**: 50-70% reduction in component render time
- **Frame Rate**: Consistent 60fps during map interactions
- **Memory Usage**: 30-40% reduction in memory consumption
- **Large Dataset Handling**: Smooth performance with 1000+ vessels

### User Experience Improvements
- **Smooth Map Interactions**: No lag during pan/zoom
- **Responsive UI**: Immediate feedback to user actions
- **Efficient Updates**: Minimal impact from real-time data updates

This comprehensive rendering performance strategy will ensure the VTMS frontend can handle real-time vessel tracking efficiently while providing a smooth, responsive user experience.