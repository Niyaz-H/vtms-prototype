# VTMS (Vessel Traffic Management System) - Architecture Document

## Executive Summary

This document outlines the architecture of a comprehensive VTMS prototype designed to showcase advanced maritime traffic monitoring capabilities. The system demonstrates real-time vessel tracking, collision detection, and interactive visualization capabilities that align with Marintel's core business focus.

**The system is available in two deployment modes:**
1. **Web Application**: Traditional client-server architecture with separate frontend and backend
2. **Desktop Application**: Electron-based native app with integrated backend server

## System Overview

The VTMS prototype is a full-stack application that:
- Processes AIS (Automatic Identification System) messages in real-time
- Tracks vessel positions, courses, and speeds
- Implements collision detection algorithms with configurable safety zones
- **NEW**: Detects suspicious activities (rendezvous meetings, loitering behavior)
- **NEW**: Full alert lifecycle management (NEW → ACKNOWLEDGED → INVESTIGATING → RESOLVED)
- Provides real-time WebSocket updates to connected clients
- Offers an interactive web dashboard with map visualization
- **NEW**: Real-time notification system for immediate alerts
- Packaged as a cross-platform desktop application (Windows, macOS, Linux)

## Technology Stack

### Backend
- **Runtime**: Bun 1.2+ / Node.js 20+ with TypeScript 5.9
- **Framework**: Express.js 5.1 for REST API
- **Real-time Communication**: Socket.IO 4.8 for WebSocket connections
- **Database**: PostgreSQL with PostGIS extension for geospatial data
- **Caching**: Redis 5.8 with ioredis 5.8 for real-time vessel state management
- **Message Queue**: In-memory queue for AIS message processing
- **Monitoring**: Morgan 1.10 for HTTP logging, Helmet 8.1 for security

### Frontend
- **Framework**: React 19.2 with TypeScript 5.9
- **Build Tool**: Vite 5.4 for fast development and HMR
- **State Management**: Zustand 4.5 for lightweight state management
- **Data Fetching**: TanStack Query v5 (modern React Query)
- **Maps**: Leaflet 1.9 with React-Leaflet 4.2 for interactive mapping
- **UI Framework**: TailwindCSS v4.1 for utility-first styling
- **UI Components**: Radix UI for accessible primitives
- **Animations**: Framer Motion 10.18
- **Charts**: Recharts 2.15 for data visualization
- **Routing**: React Router 6.30 for navigation
- **Real-time Updates**: Socket.IO client 4.8

### Desktop Application (Electron)
- **Platform**: Electron 33.2 with TypeScript 5.9
- **Main Process**: Window management, IPC handlers, system tray
- **Preload Script**: Secure context bridge with context isolation
- **Native Features**: File dialogs, notifications, persistent storage (electron-store 10.0)
- **Packaging**: electron-builder 25.1 for multi-platform distribution
- **Security**: Sandbox mode, CSP headers, validated IPC channels
- **Auto-Updates**: electron-updater 6.3 for seamless updates

### Development & Deployment
- **Package Manager**: Bun 1.2 (primary), npm/yarn compatible
- **Build System**: Vite 5.4 with vite-plugin-electron 0.28 for hot reload
- **Containerization**: Docker with docker-compose (web mode)
- **Desktop Packaging**: electron-builder (NSIS, DMG, AppImage, DEB)
- **Testing**: Jest 30.2 for unit tests, Supertest 7.1 for API tests, Playwright for E2E
- **Type Checking**: TypeScript 5.9 strict mode
- **Linting**: ESLint 8.57 with TypeScript support
- **Documentation**: OpenAPI/Swagger for API documentation

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AIS Data      │───▶│   AIS Parser     │───▶│   Vessel Store  │
│   (Simulated)   │    │   Service        │    │   (Redis)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            │
│   Web Dashboard │◀───│   WebSocket      │◀───────────┤
│   (React)       │    │   Service        │            │
│   + Toasts      │    │                  │            │
└─────────────────┘    └──────────────────┘            │
                                │                       │
                       ┌──────────────────┐            │
                       │   Collision      │◀───────────┤
                       │   Detection      │            │
                       └──────────────────┘            │
                                                        │
                       ┌──────────────────┐            │
                       │   Activity       │◀───────────┘
                       │   Detection      │
                       │   Orchestrator   │
                       └────────┬─────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
          ┌─────────▼────┐ ┌───▼────────┐ ┌▼─────────────┐
          │  Rendezvous  │ │ Loitering  │ │    Alert     │
          │   Detector   │ │  Detector  │ │   Manager    │
          └──────────────┘ └────────────┘ └──────────────┘
                                │
                       ┌──────────────────┐
                       │   REST API       │
                       │   (Express)      │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   + PostGIS      │
                       └──────────────────┘
```

## Core Components

### 1. AIS Parser Service
- Parses raw AIS NMEA sentences
- Extracts vessel metadata and position reports
- Validates message integrity and checksums
- Supports multiple AIS message types (1, 2, 3, 5, 18, 19, 24)

### 2. Vessel State Management
- Maintains real-time vessel positions in Redis
- Tracks vessel history in PostgreSQL
- Implements vessel expiration logic
- Optimized for high-frequency updates

### 3. Collision Detection Engine
- Spatial indexing using Quadtree for efficient proximity queries
- Configurable safety zones (CPA - Closest Point of Approach)
- TCPA (Time to Closest Point of Approach) calculations
- Multi-level alert system (warning, danger, critical)

### 3.5. Activity Detection System (NEW)
- **Rendezvous Detector**: Identifies suspicious vessel meetings
  - Detects vessels approaching (<0.5 NM)
  - Monitors speed reduction (<3 knots)
  - Tracks meeting duration (>5 minutes)
  - Excludes port areas
- **Loitering Detector**: Identifies vessels staying in confined areas
  - Monitors position stability (<0.2 NM radius)
  - Tracks extended durations (>2 hours)
  - Excludes anchorage zones
- **Alert Manager**: Full lifecycle management
  - States: NEW → ACKNOWLEDGED → INVESTIGATING → RESOLVED
  - Action tracking and history
  - User assignment and notes
- **Activity Orchestrator**: Coordinates all detection services (30s interval)

### 4. Real-time Communication
- WebSocket connections for live vessel updates
- Room-based broadcasting for geographic regions
- Efficient delta updates to minimize bandwidth
- Connection management and recovery

### 5. REST API
- RESTful endpoints for vessel queries
- Geographic bounding box searches
- Historical track retrieval
- System health and statistics endpoints

## Data Models

### Vessel
```typescript
interface Vessel {
  mmsi: number;              // Maritime Mobile Service Identity
  name?: string;             // Vessel name
  callSign?: string;         // Call sign
  vesselType?: number;       // AIS vessel type
  dimension?: {              // Vessel dimensions
    length: number;
    width: number;
  };
  position: {                // Current position
    latitude: number;
    longitude: number;
  };
  course?: number;           // Course over ground (degrees)
  speed?: number;            // Speed over ground (knots)
  heading?: number;          // True heading (degrees)
  timestamp: Date;           // Last update time
  status?: number;           // Navigational status
}
```

### AIS Message Types Supported
- Type 1: Position Report Class A
- Type 2: Position Report Class A (Assigned schedule)
- Type 3: Position Report Class A (Response to interrogation)
- Type 5: Static and Voyage Related Data
- Type 18: Standard Class B CS Position Report
- Type 19: Extended Class B CS Position Report
- Type 24: Static Data Report

## Performance Considerations

### Scalability
- Designed to handle 10,000+ concurrent vessels
- Redis clustering for horizontal scaling
- PostgreSQL partitioning for historical data
- WebSocket connection pooling

### Optimization
- Spatial indexing for geospatial queries
- Batch processing for AIS message ingestion
- Efficient serialization (MessagePack optional)
- CDN for static assets

### Reliability
- Graceful degradation mechanisms
- Automatic service recovery
- Health checks and monitoring endpoints
- Circuit breaker patterns for external services

## Security Considerations

- Input validation for all AIS data
- Rate limiting on API endpoints
- CORS configuration for web dashboard
- WebSocket authentication (optional for demo)

## Development Workflow

1. **Setup**: Initialize project with Bun package manager
2. **Backend**: Implement core services with TypeScript
3. **Frontend**: Build React dashboard with real-time updates
4. **Testing**: Comprehensive test suite (unit, integration, e2e)
5. **Containerization**: Docker setup for easy deployment
6. **Documentation**: API docs and deployment guides

## Demo Features

The prototype includes:
- Simulated AIS data generation for realistic vessel movement
- Interactive map with vessel tracking
- Real-time collision alerts visualization
- Historical playback capabilities
- Performance metrics dashboard
- Mobile-responsive design

This architecture demonstrates understanding of:
- Real-time data processing
- Geospatial computing
- Scalable system design
- Modern web technologies
- Maritime domain expertise