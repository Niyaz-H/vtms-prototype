# VTMS - Vessel Traffic Management System

A modern, real-time vessel traffic management system built with React, TypeScript, and Node.js. Available as both a web application and an **Electron desktop application** with native features. This prototype demonstrates advanced maritime traffic monitoring, collision detection, and vessel tracking capabilities.

## 🚢 Features

- **Real-time Vessel Tracking**: Monitor vessel positions and movements in real-time
- **Interactive Map View**: Leaflet-based map with vessel markers and route visualization
- **Collision Detection**: Advanced algorithm for detecting potential vessel collisions
- **Suspicious Activity Detection**: AI-powered detection of rendezvous meetings and loitering behavior
- **Alert Lifecycle Management**: Full workflow from detection to resolution (NEW → ACKNOWLEDGED → INVESTIGATING → RESOLVED)
- **Alert Management**: Comprehensive alert system with multiple severity levels and functional action buttons
- **Real-time Notifications**: Smart toast notifications (max 3 at once) with auto-dismiss functionality
- **System Monitoring**: Real-time system health and performance metrics
- **Simulation Mode**: Test and demonstrate system capabilities with simulated vessels
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **WebSocket Integration**: Live data updates without page refresh
- **⚡ Performance Optimized**: Instant page navigation with smart preloading and zero loading flicker

## 🛠️ Tech Stack

### Frontend
- **React 19.2** with TypeScript 5.9
- **Vite 5.4** for fast development and building
- **TailwindCSS v4.1** for styling
- **React Router 6.30** for navigation
- **Leaflet 1.9** for map visualization
- **Recharts 2.15** for data visualization
- **Zustand 4.5** for state management
- **TanStack Query v5** for data fetching (modern React Query)
- **Framer Motion 10.18** for animations
- **Radix UI** for accessible components

### Backend
- **Bun 1.2** runtime
- **Express.js 5.1** framework
- **Socket.IO 4.8** for WebSocket communication
- **TypeScript 5.9** for type safety
- **Redis 5.8** (optional) for caching
- **ioredis 5.8** for Redis client
- **AIS message parsing** for vessel data

### Desktop Application
- **Electron 33.2** for cross-platform desktop apps
- **electron-builder 25.1** for packaging
- **electron-store 10.0** for persistent settings
- **Native features**: System tray, notifications, file dialogs

## 📋 Prerequisites

- [Bun](https://bun.sh/) v1.0 or higher
- Node.js v20+ (for some build tools)
- Redis (optional, for production use)

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Niyaz-H/vtms-prototype.git
cd vtms-prototype
```

2. Install backend dependencies:
```bash
cd backend
bun install
```

3. Install frontend dependencies:
```bash
cd ../frontend
bun install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
bun run dev
```
The backend will start on `http://localhost:3001`

2. In a new terminal, start the frontend:
```bash
cd frontend
bun run dev
```
The frontend will start on `http://localhost:3000`

3. Open your browser and navigate to `http://localhost:3000`

### Running as Desktop Application (Electron)

For the best development experience with the desktop app:

1. Start the backend server (in one terminal):
```bash
cd backend
bun run dev
```

2. Start the Electron app (in another terminal):
```bash
cd vtms-prototype  # root directory
bun run dev:electron
```

The Electron app will:
- Open automatically on `http://localhost:3000`
- Skip backend startup in dev mode (uses your running backend server)
- DevTools can be opened with F12 or Ctrl+Shift+I

### Building Desktop Applications

Build the Electron desktop app for your platform:

```bash
# Build for Windows
bun run package:win

# Build for macOS
bun run package:mac

# Build for Linux
bun run package:linux

# Build for all platforms
bun run package:all
```

The built applications will be in the `release/` directory.

For more details on Electron setup and features, see [ELECTRON_SETUP.md](ELECTRON_SETUP.md).

## 🏗️ Project Structure

```
vtms-prototype/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   ├── aisParser.ts
│   │   │   ├── aisSimulation.ts
│   │   │   ├── collisionDetection.ts
│   │   │   ├── activityDetection.ts      # NEW: Activity orchestrator
│   │   │   ├── alertManager.ts           # NEW: Alert lifecycle
│   │   │   ├── rendezvousDetector.ts     # NEW: Meeting detection
│   │   │   ├── loiteringDetector.ts      # NEW: Loitering detection
│   │   │   ├── vesselStore.ts
│   │   │   └── websocket.ts
│   │   └── types/          # TypeScript types
│   │       └── activity.ts                # NEW: Activity types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

## 📡 API Endpoints

### REST API
- `GET /api/health` - System health check
- `GET /api/vessels` - Get all tracked vessels
- `GET /api/vessels/:mmsi` - Get specific vessel details
- `GET /api/alerts` - Get all active alerts
- `GET /api/alerts/:id` - Get specific alert details
- `PUT /api/alerts/:id/acknowledge` - Acknowledge an alert
- `GET /api/statistics` - Get system statistics

### WebSocket Events
- `vessel:update` - Real-time vessel position updates
- `alert:new` - New collision alert
- `alert:update` - Alert status change
- `system:status` - System status updates

## 🧪 Type Checking

Run TypeScript type checking:

```bash
# Backend
cd backend && bun tsc --noEmit

# Frontend  
cd frontend && bun tsc --noEmit
```

## 🏭 Building for Production

### Backend
```bash
cd backend
bun run build
bun run start
```

### Frontend
```bash
cd frontend
bun run build
```

The built files will be in the `frontend/dist` directory.

## 🔧 Configuration

### Backend Configuration
Create a `.env` file in the `backend` directory:

```env
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### Frontend Configuration
The frontend uses Vite's environment variables. Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## 📊 Features in Detail

### Collision Detection Algorithm
The system uses advanced algorithms to predict potential collisions:
- Calculates CPA (Closest Point of Approach)
- Monitors TCPA (Time to CPA)
- Considers vessel size and maneuverability
- Multi-level alert system (Info, Warning, Danger, Critical)

### Suspicious Activity Detection
Advanced AI-powered detection of maritime security threats:
- **Rendezvous Detection**: Identifies suspicious vessel meetings outside port areas
- **Loitering Detection**: Tracks vessels staying in areas for extended periods
- **Alert Lifecycle**: NEW → ACKNOWLEDGED → INVESTIGATING → RESOLVED → ESCALATED
- **Real-time Processing**: Continuous monitoring with immediate notifications
- **Configurable Thresholds**: Adjustable detection sensitivity and parameters

### AIS Data Processing
- Parses standard AIS messages (Types 1, 2, 3, 5, 18, 19)
- Tracks vessel identity, position, course, and speed
- Maintains vessel history and trajectory

### Real-time Updates
- WebSocket-based live updates
- Automatic reconnection on connection loss
- Efficient data streaming

### Performance Features
- **Instant Page Navigation**: Smart preloading eliminates loading delays
- **Optimized Loading**: Eager loading for frequent pages, lazy loading for others
- **Zero Flicker**: Smooth transitions with no white flash or double loading states
- **Smart Notifications**: Limited to 3 toasts with auto-dismiss and duplicate prevention
- **Type-Safe**: Full TypeScript coverage with strict type checking

## 🤝 Contributing

This is a prototype project for Marintel. For contributions or questions, please contact the development team.

## 📝 License

Copyright © 2025 Marintel. All rights reserved.

## 👤 Author

**Niyaz-H**
- GitHub: [@Niyaz-H](https://github.com/Niyaz-H)

## 🙏 Acknowledgments

- OpenStreetMap for map tiles
- Leaflet for mapping library
- The maritime industry for AIS standards

---

Built with ❤️ for safer maritime operations