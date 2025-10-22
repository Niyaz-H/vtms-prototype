# Bundle Size Reduction Strategy

## Overview

This strategy outlines a comprehensive approach to reduce the VTMS frontend bundle size by 40-60%, targeting both JavaScript and CSS assets while maintaining functionality and improving load performance.

## Current Bundle Analysis

### Estimated Current Sizes
```
Main Bundle: ~800KB gzipped
- React ecosystem: ~200KB
- Mapping libraries: ~150KB
- Chart libraries: ~120KB
- Animation libraries: ~200KB
- UI components: ~80KB
- Utilities: ~50KB

CSS Bundle: ~150KB gzipped
- Tailwind CSS: ~100KB
- Custom CSS: ~50KB
```

## Reduction Strategies

### 1. Enhanced Code Splitting

#### Current Configuration Issues
```typescript
// Current vite.config.ts - Limited chunking
manualChunks: {
  vendor: ['react', 'react-dom'],
  router: ['react-router-dom'],
  maps: ['leaflet', 'react-leaflet'],
  charts: ['recharts'],
}
```

#### Optimized Configuration
```typescript
// Optimized vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'react-core': ['react', 'react-dom'],
          
          // Routing
          'react-router': ['react-router-dom'],
          
          // State management
          'state-management': ['zustand'],
          
          // Data fetching
          'data-fetching': ['@tanstack/react-query', 'axios'],
          
          // Mapping (lazy loaded)
          'maps-core': ['leaflet'],
          'maps-react': ['react-leaflet'],
          
          // Charts (lazy loaded)
          'charts': ['recharts'],
          
          // Animations (lazy loaded)
          'animations': ['framer-motion'],
          
          // UI components
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          
          // Icons (tree-shaken)
          'ui-icons': ['lucide-react'],
          
          // Utilities
          'utils': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // Real-time communication
          'websocket': ['socket.io-client'],
          
          // Notifications
          'notifications': ['react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

### 2. Dynamic Imports for Heavy Dependencies

#### Route-Based Code Splitting
```typescript
// src/App.tsx - Optimized routing
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import LoadingSkeleton from '@/components/LoadingSkeleton'

// Lazy loaded components
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MapView = lazy(() => import('@/pages/MapView'))
const VesselDetail = lazy(() => import('@/pages/VesselDetail'))
const AlertManagement = lazy(() => import('@/pages/AlertManagement'))
const SystemMonitor = lazy(() => import('@/pages/SystemMonitor'))
const Statistics = lazy(() => import('@/pages/Statistics'))
const SimulationControl = lazy(() => import('@/pages/SimulationControl'))

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
          <Layout>
            <Suspense fallback={<LoadingSkeleton />}>
              <Dashboard />
            </Suspense>
          </Layout>
        } />
        
        <Route path="/map" element={
          <Layout>
            <Suspense fallback={<LoadingSkeleton />}>
              <MapView />
            </Suspense>
          </Layout>
        } />
        
        {/* Other routes with similar pattern */}
      </Routes>
    </div>
  )
}
```

#### Component-Level Code Splitting
```typescript
// src/components/Map/VesselMap.tsx - Lazy load heavy dependencies
import { lazy, Suspense } from 'react'

const LazyChartComponent = lazy(() => import('@/components/Charts/VesselChart'))
const LazyAnimationComponent = lazy(() => import('@/components/Animations/VesselAnimation'))

const VesselMap = () => {
  const [showChart, setShowChart] = useState(false)
  
  return (
    <div>
      {/* Map content */}
      
      {showChart && (
        <Suspense fallback={<div>Loading chart...</div>}>
          <LazyChartComponent />
        </Suspense>
      )}
    </div>
  )
}
```

### 3. Tree Shaking Optimization

#### Import Optimization
```typescript
// Before - Importing entire libraries
import * as Icons from 'lucide-react'
import { Chart as RechartsChart } from 'recharts'

// After - Importing specific components
import { MapPin, Navigation, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis } from 'recharts'
```

#### Utility Function Optimization
```typescript
// Before - Importing entire date-fns library
import * as dateFns from 'date-fns'

// After - Importing specific functions
import { format, parseISO, differenceInMinutes } from 'date-fns'
```

### 4. CSS Optimization Strategy

#### Tailwind CSS Purging
```typescript
// tailwind.config.ts - Optimized content paths
const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enable JIT mode for production
  mode: 'jit',
  // Purge unused styles
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    options: {
      safelist: [
        // Keep dynamic classes that might be generated
        /^bg-/,
        /^text-/,
        /^border-/,
      ],
    },
  },
}
```

#### Custom CSS Minimization
```css
/* Before - Verbose CSS */
.vessel-marker {
  background-color: #3b82f6;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin: 0.25rem;
}

/* After - Optimized CSS */
.vessel-marker{background:#3b82f6;border-radius:.5rem;padding:.5rem;margin:.25rem}
```

#### CSS Modules Implementation
```typescript
// src/components/Map/VesselMap.module.css
.vesselMarker {
  @apply bg-blue-500 rounded-lg p-2 m-1;
}

.alertMarker {
  @apply bg-red-500 rounded-lg p-2 m-1 animate-pulse;
}

// src/components/Map/VesselMap.tsx
import styles from './VesselMap.module.css'

const VesselMarker = ({ vessel }) => (
  <div className={styles.vesselMarker}>
    {/* Marker content */}
  </div>
)
```

### 5. Dependency Optimization

#### Replace Heavy Libraries
```typescript
// Replace Framer Motion (200KB) with CSS Transitions
// Before
import { motion } from 'framer-motion'

const AnimatedCard = motion.div

// After
import './AnimatedCard.css'

const AnimatedCard = styled.div`
  transition: all 0.3s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`
```

#### Icon Library Optimization
```typescript
// Before - Multiple icon libraries
import { Icon1 } from '@heroicons/react'
import { Icon2 } from 'lucide-react'

// After - Single optimized icon library
import { Icon1, Icon2 } from 'lucide-react'
```

### 6. Asset Optimization

#### Image Optimization
```typescript
// src/utils/imageOptimization.ts
export const optimizeImage = (src: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpg'
}) => {
  const { width, height, quality = 80, format = 'webp' } = options
  
  return `${src}?w=${width}&h=${height}&q=${quality}&f=${format}`
}

// Usage
const optimizedSrc = optimizeImage('/vessel-icon.png', {
  width: 24,
  height: 24,
  quality: 75,
  format: 'webp'
})
```

#### Font Loading Optimization
```html
<!-- index.html - Optimized font loading -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- CSS with font-display: swap -->
<style>
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2) format('woff2');
  }
</style>
```

### 7. Build Optimization

#### Vite Configuration Enhancements
```typescript
// vite.config.ts - Production optimizations
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
    },
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        compact: true,
        manualChunks: (id) => {
          // Custom chunking logic
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor'
            if (id.includes('leaflet')) return 'maps-vendor'
            if (id.includes('framer-motion')) return 'animation-vendor'
            return 'vendor'
          }
        },
      },
    },
  },
  plugins: [
    // Add bundle analyzer
    process.env.ANALYZE && bundleAnalyzer(),
  ].filter(Boolean),
})
```

## Implementation Plan

### Phase 1: Immediate Wins (Week 1)
1. **Configure enhanced code splitting**
2. **Implement dynamic imports for routes**
3. **Optimize Tailwind CSS purging**
4. **Remove unused dependencies**

### Phase 2: Advanced Optimizations (Week 2-3)
1. **Implement component-level code splitting**
2. **Optimize imports and tree shaking**
3. **Replace heavy libraries where possible**
4. **Implement CSS modules**

### Phase 3: Fine-tuning (Week 4)
1. **Optimize asset loading**
2. **Configure build optimizations**
3. **Implement bundle analysis**
4. **Performance testing and validation**

## Expected Results

### Bundle Size Reduction
```
Before Optimization:
- Main Bundle: ~800KB gzipped
- CSS Bundle: ~150KB gzipped
- Total: ~950KB gzipped

After Optimization:
- Main Bundle: ~320KB gzipped (60% reduction)
- CSS Bundle: ~60KB gzipped (60% reduction)
- Lazy Loaded Chunks: ~400KB total (loaded on demand)
- Initial Load: ~380KB gzipped (60% reduction)
```

### Performance Improvements
- **First Contentful Paint**: 30-40% faster
- **Time to Interactive**: 40-50% faster
- **Bundle Download Time**: 60% reduction
- **Memory Usage**: 25-30% reduction

## Monitoring and Validation

### Bundle Analysis Tools
```bash
# Analyze bundle composition
npm run build -- --analyze

# Track bundle size over time
npm run build:stats

# Check for unused dependencies
npm depcheck
```

### Performance Metrics
```typescript
// src/utils/performanceMonitoring.ts
export const trackBundleSize = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('chunk')) {
        console.log(`Chunk ${entry.name}: ${entry.transferSize} bytes`)
      }
    }
  })
  
  observer.observe({ entryTypes: ['resource'] })
}
```

This comprehensive bundle size reduction strategy will significantly improve the VTMS frontend performance while maintaining all existing functionality and improving the overall user experience.