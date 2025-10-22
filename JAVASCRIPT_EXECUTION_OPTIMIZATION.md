# JavaScript Execution Optimization Strategy

## Overview

This strategy focuses on optimizing JavaScript execution performance in the VTMS frontend to reduce main thread blocking, improve responsiveness, and ensure smooth real-time data processing for vessel tracking and collision detection.

## Current JavaScript Performance Issues

### Identified Performance Bottlenecks

#### 1. Synchronous WebSocket Processing
```typescript
// Current websocketStore.ts - Blocking updates
socket.on('vessel_update', (data: any) => {
  const { vessel } = data
  set((state: any) => {
    // ❌ Synchronous processing blocks main thread
    const exists = state.vessels.some((v: Vessel) => v.mmsi === vessel.mmsi)
    if (exists) {
      return {
        vessels: state.vessels.map((v: Vessel) => 
          v.mmsi === vessel.mmsi ? vessel : v
        )
      }
    } else {
      return { vessels: [...state.vessels, vessel] }
    }
  })
})
```

#### 2. Expensive Calculations on Main Thread
```typescript
// Current VesselMap.tsx - Blocking alert calculations
const getVesselAlertLevel = (mmsi: number): string | undefined => {
  // ❌ Computed on every render, blocks main thread
  const vesselAlerts = alerts.filter(alert => 
    !alert.resolved && (alert.vessels[0] === mmsi.toString() || alert.vessels[1] === mmsi.toString())
  )
  
  if (vesselAlerts.some(a => a.level === 'critical')) return 'critical'
  if (vesselAlerts.some(a => a.level === 'danger')) return 'danger'
  if (vesselAlerts.some(a => a.level === 'warning')) return 'warning'
  return undefined
}
```

#### 3. Large Data Processing
```typescript
// Current processing - No chunking or batching
const processVesselData = (vessels: Vessel[]) => {
  // ❌ Processes all vessels at once
  return vessels.map(vessel => ({
    ...vessel,
    calculatedField: expensiveCalculation(vessel),
    transformedData: heavyTransformation(vessel)
  }))
}
```

## Optimization Strategies

### 1. Web Workers for Heavy Computations

#### Vessel Data Processing Worker
```typescript
// src/workers/vesselProcessor.worker.ts
interface VesselProcessingMessage {
  type: 'PROCESS_VESSELS' | 'CALCULATE_ALERTS' | 'UPDATE_POSITIONS'
  data: any
}

interface VesselProcessingResult {
  type: string
  result: any
  id: string
}

// Heavy computational tasks
const expensiveCalculations = {
  processVessels: (vessels: Vessel[]): ProcessedVessel[] => {
    return vessels.map(vessel => ({
      ...vessel,
      riskScore: calculateRiskScore(vessel),
      predictedPosition: predictPosition(vessel),
      collisionRisk: assessCollisionRisk(vessel, vessels)
    }))
  },
  
  calculateAlerts: (vessels: Vessel[], alerts: CollisionAlert[]): AlertLevel[] => {
    const alertMap = new Map<number, string>()
    
    alerts
      .filter(alert => !alert.resolved)
      .forEach(alert => {
        alert.vessels.forEach(vesselMmsi => {
          const mmsi = parseInt(vesselMmsi)
          const currentLevel = alertMap.get(mmsi)
          
          if (!currentLevel || isMoreSevere(alert.level, currentLevel)) {
            alertMap.set(mmsi, alert.level)
          }
        })
      })
    
    return Array.from(alertMap.entries()).map(([mmsi, level]) => ({
      mmsi,
      level
    }))
  },
  
  updatePositions: (updates: VesselUpdate[]): Vessel[] => {
    return updates.map(update => ({
      ...update.vessel,
      position: update.position,
      lastUpdate: update.timestamp,
      velocity: calculateVelocity(update)
    }))
  }
}

// Worker message handler
self.onmessage = (event: MessageEvent<VesselProcessingMessage>) => {
  const { type, data } = event.data
  const id = Math.random().toString(36).substr(2, 9)
  
  try {
    let result
    
    switch (type) {
      case 'PROCESS_VESSELS':
        result = expensiveCalculations.processVessels(data.vessels)
        break
      case 'CALCULATE_ALERTS':
        result = expensiveCalculations.calculateAlerts(data.vessels, data.alerts)
        break
      case 'UPDATE_POSITIONS':
        result = expensiveCalculations.updatePositions(data.updates)
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    self.postMessage({
      type,
      result,
      id
    } as VesselProcessingResult)
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      result: { error: error.message },
      id
    } as VesselProcessingResult)
  }
}
```

#### Worker Manager
```typescript
// src/utils/workerManager.ts
export class WorkerManager {
  private static instance: WorkerManager
  private workers: Map<string, Worker[]> = new Map()
  private taskQueue: Map<string, Array<any>> = new Map()
  private maxWorkers = 2
  
  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager()
    }
    return WorkerManager.instance
  }
  
  private getWorker(workerType: string): Worker {
    if (!this.workers.has(workerType)) {
      this.workers.set(workerType, [])
    }
    
    const workers = this.workers.get(workerType)!
    
    if (workers.length < this.maxWorkers) {
      const worker = new Worker(`/workers/${workerType}.worker.js`)
      workers.push(worker)
      return worker
    }
    
    // Round-robin worker selection
    return workers[Math.floor(Math.random() * workers.length)]
  }
  
  async executeTask<T>(
    workerType: string, 
    taskType: string, 
    data: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker(workerType)
      const taskId = Math.random().toString(36).substr(2, 9)
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === taskId) {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          
          if (event.data.type === 'ERROR') {
            reject(new Error(event.data.result.error))
          } else {
            resolve(event.data.result)
          }
        }
      }
      
      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
        reject(error.error)
      }
      
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      
      worker.postMessage({
        type: taskType,
        data,
        id: taskId
      })
    })
  }
  
  terminateAll() {
    this.workers.forEach(workers => {
      workers.forEach(worker => worker.terminate())
    })
    this.workers.clear()
  }
}
```

### 2. RequestAnimationFrame for Smooth Updates

#### Optimized Animation Loop
```typescript
// src/utils/animationFrame.ts
export class AnimationFrameManager {
  private static instance: AnimationFrameManager
  private callbacks: Map<string, FrameRequestCallback> = new Map()
  private isRunning = false
  private lastTime = 0
  
  static getInstance(): AnimationFrameManager {
    if (!AnimationFrameManager.instance) {
      AnimationFrameManager.instance = new AnimationFrameManager()
    }
    return AnimationFrameManager.instance
  }
  
  register(id: string, callback: FrameRequestCallback) {
    this.callbacks.set(id, callback)
    this.start()
  }
  
  unregister(id: string) {
    this.callbacks.delete(id)
    if (this.callbacks.size === 0) {
      this.stop()
    }
  }
  
  private start() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.lastTime = performance.now()
    this.animate()
  }
  
  private stop() {
    this.isRunning = false
  }
  
  private animate = (currentTime: number) => {
    if (!this.isRunning) return
    
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    // Execute all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(deltaTime)
      } catch (error) {
        console.error('Animation callback error:', error)
      }
    })
    
    requestAnimationFrame(this.animate)
  }
}
```

#### Smooth Vessel Updates
```typescript
// src/hooks/useSmoothVesselUpdates.ts
import { useEffect, useRef } from 'react'
import { AnimationFrameManager } from '@/utils/animationFrame'
import { WorkerManager } from '@/utils/workerManager'

export const useSmoothVesselUpdates = (vessels: Vessel[]) => {
  const processedVesselsRef = useRef<ProcessedVessel[]>([])
  const updateQueueRef = useRef<Vessel[]>([])
  const lastUpdateTimeRef = useRef(0)
  
  useEffect(() => {
    const animationManager = AnimationFrameManager.getInstance()
    const workerManager = WorkerManager.getInstance()
    
    const processVessels = async (deltaTime: number) => {
      const now = performance.now()
      
      // Throttle updates to 60fps
      if (now - lastUpdateTimeRef.current < 16) return
      
      // Add new vessels to queue
      updateQueueRef.current.push(...vessels)
      
      // Process in batches to avoid blocking
      const batchSize = 50
      const batch = updateQueueRef.current.splice(0, batchSize)
      
      if (batch.length > 0) {
        try {
          const processed = await workerManager.executeTask<ProcessedVessel[]>(
            'vesselProcessor',
            'PROCESS_VESSELS',
            { vessels: batch }
          )
          
          processedVesselsRef.current = processed
          lastUpdateTimeRef.current = now
          
        } catch (error) {
          console.error('Vessel processing error:', error)
        }
      }
    }
    
    animationManager.register('vessel-updates', processVessels)
    
    return () => {
      animationManager.unregister('vessel-updates')
    }
  }, [vessels])
  
  return processedVesselsRef.current
}
```

### 3. Debouncing and Throttling

#### Optimized Event Handlers
```typescript
// src/utils/eventOptimization.ts
export class EventOptimizer {
  private static debounceTimers = new Map<string, NodeJS.Timeout>()
  private static throttleTimestamps = new Map<string, number>()
  
  static debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number
  ): T {
    return ((...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key)
      
      if (existingTimer) {
        clearTimeout(existingTimer)
      }
      
      const timer = setTimeout(() => {
        fn(...args)
        this.debounceTimers.delete(key)
      }, delay)
      
      this.debounceTimers.set(key, timer)
    }) as T
  }
  
  static throttle<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    limit: number
  ): T {
    return ((...args: Parameters<T>) => {
      const now = performance.now()
      const lastExecution = this.throttleTimestamps.get(key) || 0
      
      if (now - lastExecution >= limit) {
        fn(...args)
        this.throttleTimestamps.set(key, now)
      }
    }) as T
  }
}
```

#### Optimized Map Interactions
```typescript
// src/components/Map/OptimizedVesselMap.tsx
import { EventOptimizer } from '@/utils/eventOptimization'

const OptimizedVesselMap = () => {
  const [mapBounds, setMapBounds] = useState<Bounds>()
  
  // Debounced bounds update
  const handleMapMove = EventOptimizer.debounce(
    'map-move',
    (bounds: Bounds) => {
      setMapBounds(bounds)
      // Trigger vessel filtering for new bounds
    },
    100
  )
  
  // Throttled zoom update
  const handleMapZoom = EventOptimizer.throttle(
    'map-zoom',
    (zoom: number) => {
      // Adjust vessel clustering based on zoom
    },
    50
  )
  
  return (
    <MapContainer
      events={{
        moveend: (e) => handleMapMove(e.target.getBounds()),
        zoomend: (e) => handleMapZoom(e.target.getZoom())
      }}
    >
      {/* Map content */}
    </MapContainer>
  )
}
```

### 4. Memory Management

#### Object Pooling
```typescript
// src/utils/objectPool.ts
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }
  
  release(obj: T) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }
  
  clear() {
    this.pool.length = 0
  }
}

// Usage for vessel objects
const vesselPool = new ObjectPool(
  () => ({
    mmsi: 0,
    name: '',
    position: { latitude: 0, longitude: 0 },
    speed: 0,
    course: 0
  }),
  (vessel) => {
    vessel.mmsi = 0
    vessel.name = ''
    vessel.position.latitude = 0
    vessel.position.longitude = 0
    vessel.speed = 0
    vessel.course = 0
  }
)
```

#### Memory Leak Prevention
```typescript
// src/utils/memoryManager.ts
export class MemoryManager {
  private static observers: Set<MutationObserver> = new Set()
  private static timers: Set<NodeJS.Timeout> = new Set()
  private static eventListeners: Map<EventTarget, Array<{type: string, listener: Function}>> = new Map()
  
  static addObserver(observer: MutationObserver) {
    this.observers.add(observer)
  }
  
  static removeObserver(observer: MutationObserver) {
    observer.disconnect()
    this.observers.delete(observer)
  }
  
  static addTimer(timer: NodeJS.Timeout) {
    this.timers.add(timer)
  }
  
  static removeTimer(timer: NodeJS.Timeout) {
    clearTimeout(timer)
    this.timers.delete(timer)
  }
  
  static addEventListener(
    target: EventTarget, 
    type: string, 
    listener: EventListener
  ) {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, [])
    }
    
    this.eventListeners.get(target)!.push({ type, listener })
    target.addEventListener(type, listener)
  }
  
  static removeAllEventListeners(target: EventTarget) {
    const listeners = this.eventListeners.get(target)
    if (listeners) {
      listeners.forEach(({ type, listener }) => {
        target.removeEventListener(type, listener as EventListener)
      })
      this.eventListeners.delete(target)
    }
  }
  
  static cleanup() {
    // Clean up all resources
    this.observers.forEach(observer => observer.disconnect())
    this.timers.forEach(timer => clearTimeout(timer))
    
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ type, listener }) => {
        target.removeEventListener(type, listener as EventListener)
      })
    })
    
    this.observers.clear()
    this.timers.clear()
    this.eventListeners.clear()
  }
}
```

### 5. Lazy Evaluation

#### Computed Properties
```typescript
// src/hooks/useComputedProperties.ts
export class ComputedProperty<T> {
  private dependencies: any[]
  private computeFn: () => T
  private cachedValue: T
  private isDirty = true
  
  constructor(dependencies: any[], computeFn: () => T) {
    this.dependencies = dependencies
    this.computeFn = computeFn
    this.cachedValue = computeFn()
  }
  
  getValue(): T {
    if (this.isDirty) {
      this.cachedValue = this.computeFn()
      this.isDirty = false
    }
    return this.cachedValue
  }
  
  invalidate() {
    this.isDirty = true
  }
  
  checkDependencies(newDependencies: any[]) {
    if (!this.arraysEqual(this.dependencies, newDependencies)) {
      this.dependencies = newDependencies
      this.invalidate()
    }
  }
  
  private arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index])
  }
}

// Usage in components
export const useComputedAlertLevels = (vessels: Vessel[], alerts: CollisionAlert[]) => {
  const alertLevelsRef = useRef<ComputedProperty<Map<number, string>>>()
  
  if (!alertLevelsRef.current) {
    alertLevelsRef.current = new ComputedProperty(
      [vessels, alerts],
      () => {
        const alertMap = new Map<number, string>()
        
        alerts
          .filter(alert => !alert.resolved)
          .forEach(alert => {
            alert.vessels.forEach(vesselMmsi => {
              const mmsi = parseInt(vesselMmsi)
              const currentLevel = alertMap.get(mmsi)
              
              if (!currentLevel || isMoreSevere(alert.level, currentLevel)) {
                alertMap.set(mmsi, alert.level)
              }
            })
          })
        
        return alertMap
      }
    )
  }
  
  alertLevelsRef.current.checkDependencies([vessels, alerts])
  
  return alertLevelsRef.current.getValue()
}
```

### 6. Performance Monitoring

#### JavaScript Execution Tracker
```typescript
// src/utils/performanceTracker.ts
export class JavaScriptPerformanceTracker {
  private static instance: JavaScriptPerformanceTracker
  private marks: Map<string, number> = new Map()
  private measures: Array<{name: string, duration: number, timestamp: number}> = []
  
  static getInstance(): JavaScriptPerformanceTracker {
    if (!JavaScriptPerformanceTracker.instance) {
      JavaScriptPerformanceTracker.instance = new JavaScriptPerformanceTracker()
    }
    return JavaScriptPerformanceTracker.instance
  }
  
  mark(name: string) {
    this.marks.set(name, performance.now())
  }
  
  measure(name: string, startMark: string) {
    const startTime = this.marks.get(startMark)
    if (!startTime) {
      console.warn(`Mark "${startMark}" not found`)
      return
    }
    
    const duration = performance.now() - startTime
    this.measures.push({
      name,
      duration,
      timestamp: performance.now()
    })
    
    if (duration > 16) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
  
  getAverageDuration(name: string): number {
    const measures = this.measures.filter(m => m.name === name)
    if (measures.length === 0) return 0
    
    const total = measures.reduce((sum, m) => sum + m.duration, 0)
    return total / measures.length
  }
  
  getReport(): PerformanceReport {
    const report: PerformanceReport = {
      totalMeasures: this.measures.length,
      slowOperations: this.measures.filter(m => m.duration > 16),
      averageOperationTime: this.measures.reduce((sum, m) => sum + m.duration, 0) / this.measures.length
    }
    
    return report
  }
  
  clear() {
    this.marks.clear()
    this.measures.length = 0
  }
}

interface PerformanceReport {
  totalMeasures: number
  slowOperations: Array<{name: string, duration: number, timestamp: number}>
  averageOperationTime: number
}
```

## Implementation Plan

### Phase 1: Worker Implementation (Week 1)
1. **Create vessel processing worker**
2. **Implement worker manager**
3. **Offload heavy calculations**

### Phase 2: Animation Optimization (Week 2)
1. **Implement animation frame manager**
2. **Optimize vessel updates**
3. **Add smooth transitions**

### Phase 3: Event Optimization (Week 3)
1. **Implement debouncing/throttling**
2. **Optimize map interactions**
3. **Reduce event handler overhead**

### Phase 4: Memory Management (Week 4)
1. **Implement object pooling**
2. **Add memory leak prevention**
3. **Set up performance monitoring**

## Expected Results

### Performance Improvements
- **Main Thread Blocking**: 70-80% reduction in blocking time
- **JavaScript Execution**: 50-60% faster heavy computations
- **Memory Usage**: 30-40% reduction in memory consumption
- **Frame Rate**: Consistent 60fps during heavy operations

### User Experience Improvements
- **Responsive UI**: No freezing during data processing
- **Smooth Animations**: Fluid map interactions
- **Stable Performance**: Consistent performance over time
- **Reduced Jank**: Eliminated micro-stutters

This comprehensive JavaScript execution optimization strategy will ensure the VTMS frontend can handle real-time vessel tracking and collision detection efficiently while maintaining smooth user interactions.