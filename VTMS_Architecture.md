# VTMS (Vessel Traffic Management System) - Architecture Document

## Executive Summary

This document outlines the architecture of a comprehensive VTMS prototype designed to showcase advanced maritime traffic monitoring capabilities. The system demonstrates real-time vessel tracking, collision detection, and interactive visualization capabilities that align with Marintel's core business focus.

## System Overview

The VTMS prototype is a full-stack application that:
- Processes AIS (Automatic Identification System) messages in real-time
- Tracks vessel positions, courses, and speeds
- Implements collision detection algorithms with configurable safety zones
- Provides real-time WebSocket updates to connected clients
- Offers an interactive web dashboard with map visualization

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js for REST API
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Database**: PostgreSQL with PostGIS extension for geospatial data
- **Caching**: Redis for real-time vessel state management
- **Message Queue**: In-memory queue for AIS message processing

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for lightweight state management
- **Maps**: Leaflet with React-Leaflet for interactive mapping
- **UI Components**: Tailwind CSS for styling
- **Real-time Updates**: Socket.IO client

### Development & Deployment
- **Package Manager**: Bun (as specified)
- **Containerization**: Docker with docker-compose
- **Testing**: Jest for unit tests, Supertest for API tests
- **Documentation**: OpenAPI/Swagger for API documentation

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AIS Data      │───▶│   AIS Parser     │───▶│   Vessel Store  │
│   (Simulated)   │    │   Service        │    │   (Redis)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            │
│   Web Dashboard │◀───│   WebSocket      │◀───────────┘
│   (React)       │    │   Service        │
└─────────────────┘    └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Collision      │
                       │   Detection      │
                       │   Engine         │
                       └──────────────────┘
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