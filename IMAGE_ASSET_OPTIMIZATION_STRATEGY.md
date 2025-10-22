# Image and Asset Optimization Strategy

## Overview

This strategy outlines a comprehensive approach to optimize images, icons, maps, and other assets in the VTMS frontend to reduce load times, improve performance, and enhance the user experience while maintaining visual quality.

## Current Asset Analysis

### Identified Asset Issues

#### 1. External Resource Dependencies
```html
<!-- Current index.html - Blocking resources -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<!-- VesselMap.tsx - External CDN dependencies -->
iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
```

#### 2. Map Tile Loading Issues
```typescript
// Current VesselMap.tsx - Unoptimized tile loading
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>
```

#### 3. SVG Icon Inefficiencies
```typescript
// Current VesselMap.tsx - Inline SVG for each marker
html: `
  <div style="transform: rotate(${course}deg);">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 12h4v8h8v-8h4L12 2z" stroke="white" stroke-width="1"/>
    </svg>
  </div>
`,
```

## Optimization Strategies

### 1. Image Format Optimization

#### Modern Image Formats
```typescript
// src/utils/imageOptimizer.ts
export interface ImageOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
  eager?: boolean
}

export class ImageOptimizer {
  private static supportedFormats: string[] = []
  
  static async detectSupport() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    // Test AVIF support
    try {
      const avifData = new Uint8Array([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
        0x00, 0x00, 0x00, 0x00, 0x61, 0x76, 0x69, 0x66, 0x6D, 0x69, 0x66, 0x31,
        0x00, 0x00, 0x00, 0x00
      ])
      const avifBlob = new Blob([avifData], { type: 'image/avif' })
      const avifImage = await createImageBitmap(avifBlob)
      this.supportedFormats.push('avif')
    } catch (e) {
      console.log('AVIF not supported')
    }
    
    // Test WebP support
    try {
      const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
      const webpImage = new Image()
      await new Promise((resolve, reject) => {
        webpImage.onload = resolve
        webpImage.onerror = reject
        webpImage.src = webpData
      })
      this.supportedFormats.push('webp')
    } catch (e) {
      console.log('WebP not supported')
    }
  }
  
  static getOptimalFormat(preferredOrder: string[] = ['avif', 'webp', 'jpg']): string {
    for (const format of preferredOrder) {
      if (this.supportedFormats.includes(format)) {
        return format
      }
    }
    return 'jpg' // Fallback
  }
  
  static generateSrcset(basePath: string, options: ImageOptions): string {
    const sizes = [320, 640, 768, 1024, 1280, 1536]
    const format = this.getOptimalFormat()
    
    return sizes
      .map(size => `${basePath}?w=${size}&f=${format}&q=${options.quality || 80} ${size}w`)
      .join(', ')
  }
  
  static generateSizes(): string {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  }
}
```

#### Optimized Image Component
```typescript
// src/components/OptimizedImage.tsx
import React, { useState, useRef, useEffect } from 'react'
import { ImageOptimizer } from '@/utils/imageOptimizer'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  sizes,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  
  const optimizedSrc = ImageOptimizer.generateSrcset(src, {
    width,
    height,
    quality: 80
  })
  
  const optimizedSizes = sizes || ImageOptimizer.generateSizes()
  
  useEffect(() => {
    ImageOptimizer.detectSupport()
  }, [])
  
  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }
  
  const handleError = () => {
    setHasError(true)
    onError?.()
  }
  
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Low quality placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      
      {/* Optimized image */}
      <img
        ref={imgRef}
        srcSet={optimizedSrc}
        sizes={optimizedSizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width, height }}
      />
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-500 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  )
}

export default OptimizedImage
```

### 2. Icon Optimization Strategy

#### SVG Sprite System
```typescript
// src/components/Icon/SpriteIcon.tsx
import React from 'react'

interface SpriteIconProps {
  name: string
  size?: number
  className?: string
  color?: string
}

const SpriteIcon: React.FC<SpriteIconProps> = ({ 
  name, 
  size = 24, 
  className = '', 
  color 
}) => {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      fill={color || 'currentColor'}
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}

export default SpriteIcon
```

#### Icon Generation Script
```typescript
// scripts/generateIconSprite.ts
import { promises as fs } from 'fs'
import path from 'path'

async function generateIconSprite() {
  const iconsDir = path.join(__dirname, '../src/assets/icons')
  const outputFile = path.join(__dirname, '../public/icons/sprite.svg')
  
  const iconFiles = await fs.readdir(iconsDir)
  const svgContents = await Promise.all(
    iconFiles
      .filter(file => file.endsWith('.svg'))
      .map(async (file) => {
        const content = await fs.readFile(path.join(iconsDir, file), 'utf-8')
        const name = path.basename(file, '.svg')
        const svgContent = content
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>/, '')
          .replace(/width="[^"]*"/, '')
          .replace(/height="[^"]*"/, '')
        
        return `<symbol id="${name}" viewBox="0 0 24 24">${svgContent}</symbol>`
      })
  )
  
  const sprite = `
    <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      ${svgContents.join('\n')}
    </svg>
  `.trim()
  
  await fs.writeFile(outputFile, sprite)
  console.log(`Generated sprite with ${iconFiles.length} icons`)
}

generateIconSprite().catch(console.error)
```

#### Optimized Vessel Icons
```typescript
// src/components/Map/VesselIcon.tsx
import React, { useMemo } from 'react'
import { DivIcon } from 'leaflet'
import SpriteIcon from '@/components/Icon/SpriteIcon'

interface VesselIconProps {
  course: number
  alertLevel?: string
  size?: number
}

const VesselIcon: React.FC<VesselIconProps> = ({ 
  course, 
  alertLevel, 
  size = 24 
}) => {
  const icon = useMemo(() => {
    const color = alertLevel === 'critical' ? '#dc2626' 
      : alertLevel === 'danger' ? '#ea580c'
      : alertLevel === 'warning' ? '#eab308'
      : '#3b82f6'
    
    // Use CSS transforms instead of inline SVG
    return new DivIcon({
      className: 'vessel-marker',
      html: `
        <div class="vessel-icon-container" style="transform: rotate(${course}deg);">
          <div class="vessel-icon" style="width: ${size}px; height: ${size}px; background: ${color};">
            <svg viewBox="0 0 24 24" fill="white" width="${size}" height="${size}">
              <path d="M12 2L4 12h4v8h8v-8h4L12 2z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [course, alertLevel, size])
  
  return icon
}

export default VesselIcon
```

### 3. Map Tile Optimization

#### Optimized Tile Loading
```typescript
// src/components/Map/OptimizedTileLayer.tsx
import React from 'react'
import { TileLayer } from 'react-leaflet'

interface OptimizedTileLayerProps {
  url?: string
  attribution?: string
  maxZoom?: number
  minZoom?: number
}

const OptimizedTileLayer: React.FC<OptimizedTileLayerProps> = ({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom = 19,
  minZoom = 1
}) => {
  return (
    <TileLayer
      url={url}
      attribution={attribution}
      maxZoom={maxZoom}
      minZoom={minZoom}
      // Optimization options
      updateWhenZooming={false}
      updateWhenIdle={true}
      keepBuffer={4}
      // Cross-origin for better caching
      crossOrigin={true}
      // Tile loading optimization
      className="optimized-tile-layer"
    />
  )
}

export default OptimizedTileLayer
```

#### Tile Caching Strategy
```typescript
// src/utils/tileCache.ts
export class TileCache {
  private cache: Map<string, Blob> = new Map()
  private maxCacheSize = 100 // Cache up to 100 tiles
  private cacheHits = 0
  private cacheMisses = 0
  
  async getTile(url: string): Promise<Blob> {
    if (this.cache.has(url)) {
      this.cacheHits++
      return this.cache.get(url)!
    }
    
    this.cacheMisses++
    const response = await fetch(url)
    const blob = await response.blob()
    
    // Add to cache
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest tile
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(url, blob)
    return blob
  }
  
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses
    return {
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
      cacheSize: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses
    }
  }
  
  clearCache() {
    this.cache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }
}
```

### 4. Font Loading Optimization

#### Optimized Font Loading
```html
<!-- index.html - Optimized font loading -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Critical fonts with high priority -->
<link 
  rel="preload" 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" 
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
>
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
</noscript>

<!-- Non-critical fonts with low priority -->
<link 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500&family=JetBrains+Mono:wght@400;500&display=swap" 
  rel="stylesheet"
  media="print" onload="this.media='all'"
>
```

#### Font Display Strategy
```css
/* src/styles/fonts.css */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap; /* Prevents blocking */
  src: local('Inter Regular'), local('Inter-Regular'),
       url('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2') format('woff2');
}

/* System font fallback */
.system-font {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}

/* Optimized font loading states */
.font-loading {
  font-family: system-font;
}

.font-loaded {
  font-family: 'Inter', system-font;
}
```

### 5. Asset Loading Strategy

#### Progressive Loading
```typescript
// src/hooks/useProgressiveImage.ts
import { useState, useEffect } from 'react'

export const useProgressiveImage = (src: string, placeholderSrc?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || '')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    const img = new Image()
    img.src = src
    
    const onLoad = () => {
      setImageSrc(src)
      setIsLoading(false)
    }
    
    const onError = () => {
      setHasError(true)
      setIsLoading(false)
    }
    
    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
    
    return () => {
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }
  }, [src])
  
  return { imageSrc, isLoading, hasError }
}
```

#### Asset Preloading
```typescript
// src/utils/assetPreloader.ts
export class AssetPreloader {
  private static preloadedAssets = new Set<string>()
  
  static preloadImage(src: string): Promise<void> {
    if (this.preloadedAssets.has(src)) {
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.preloadedAssets.add(src)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }
  
  static preloadCriticalAssets() {
    const criticalAssets = [
      '/icons/vessel-normal.svg',
      '/icons/vessel-warning.svg',
      '/icons/vessel-danger.svg',
      '/icons/vessel-critical.svg',
    ]
    
    return Promise.all(criticalAssets.map(asset => this.preloadImage(asset)))
  }
  
  static preloadRouteAssets(route: string) {
    const routeAssets: Record<string, string[]> = {
      '/map': [
        '/icons/map-controls.svg',
        '/icons/legend.svg',
      ],
      '/dashboard': [
        '/icons/dashboard-widgets.svg',
      ],
    }
    
    const assets = routeAssets[route] || []
    return Promise.all(assets.map(asset => this.preloadImage(asset)))
  }
}
```

### 6. Service Worker for Asset Caching

#### Asset Caching Service Worker
```typescript
// public/sw.js
const CACHE_NAME = 'vtms-assets-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/sprite.svg',
  '/fonts/inter-regular.woff2',
  '/fonts/inter-bold.woff2',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Only cache GET requests
  if (request.method !== 'GET') return
  
  // Cache static assets
  if (request.url.includes('/icons/') || 
      request.url.includes('/fonts/') ||
      request.url.includes('/images/')) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.ok) {
                const responseClone = response.clone()
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone))
              }
              return response
            })
        })
    )
  }
})
```

## Implementation Plan

### Phase 1: Image Optimization (Week 1)
1. **Implement OptimizedImage component**
2. **Add modern format support (WebP/AVIF)**
3. **Set up image optimization pipeline**

### Phase 2: Icon Optimization (Week 2)
1. **Create SVG sprite system**
2. **Optimize vessel icons**
3. **Implement icon caching**

### Phase 3: Map Optimization (Week 3)
1. **Implement tile caching**
2. **Optimize tile loading**
3. **Add offline map support**

### Phase 4: Font and Asset Loading (Week 4)
1. **Optimize font loading strategy**
2. **Implement progressive loading**
3. **Set up service worker for caching**

## Expected Results

### Performance Improvements
- **Image Load Time**: 60-70% reduction
- **Font Load Time**: 40-50% reduction
- **Map Tile Loading**: 30-40% improvement
- **Cache Hit Rate**: 80-90% for returning users

### Bundle Size Impact
- **Image Assets**: 50-60% size reduction with modern formats
- **Icon Bundle**: 70-80% reduction with sprite system
- **Font Loading**: 30-40% reduction with optimized loading

### User Experience Improvements
- **Faster Initial Load**: Optimized critical resource loading
- **Smooth Interactions**: No layout shifts from image loading
- **Offline Capability**: Cached assets available offline

This comprehensive image and asset optimization strategy will significantly improve the VTMS frontend performance while maintaining visual quality and providing a better user experience.