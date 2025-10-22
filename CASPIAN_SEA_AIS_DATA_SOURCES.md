# Caspian Sea Real-Time AIS Data Sources

## Overview
This document outlines available sources for real-time AIS (Automatic Identification System) vessel data in the Caspian Sea region, particularly for Azerbaijan waters.

## Coordinates Reference
- **Caspian Sea Azerbaijan Border**: 
  - Latitude: 38.5°N to 41.5°N
  - Longitude: 47.5°E to 50.5°E
  - Center: 40.0°N, 49.0°E

## Available AIS Data Sources

### 1. MarineTraffic API
**Website**: https://www.marinetraffic.com/en/ais-api-services

**Coverage**: Global, includes Caspian Sea
**Access**: Commercial API
**Features**:
- Real-time vessel positions
- Historical data
- Vessel details (MMSI, name, type, destination)
- RESTful API and WebSocket streams

**Example Endpoint**:
```
GET /exportvessel/v:8/protocol:jsono/msgtype:extended/area:38.5,41.5,47.5,50.5
```

**Pricing**: Starts at ~$100/month for basic access

### 2. VesselFinder API
**Website**: https://www.vesselfinder.com/api

**Coverage**: Global maritime traffic
**Access**: Commercial API
**Features**:
- Real-time AIS data
- Vessel tracking
- Port information
- Historical tracks

**Pricing**: Custom pricing based on usage

### 3. AISHub
**Website**: http://www.aishub.net/

**Coverage**: Community-driven AIS data
**Access**: Free for non-commercial, API available
**Features**:
- Crowd-sourced AIS data
- Basic vessel information
- Limited historical data

**Pricing**: Free tier available, paid plans for commercial use

### 4. Global Fishing Watch
**Website**: https://globalfishingwatch.org/

**Coverage**: Focus on fishing vessels globally
**Access**: Open API for research
**Features**:
- Fishing vessel activity
- Free for research purposes
- Good for fishing fleet monitoring in Caspian Sea

### 5. Spire Maritime
**Website**: https://spire.com/maritime/

**Coverage**: Global, satellite-based AIS
**Access**: Commercial API
**Features**:
- Satellite AIS (S-AIS)
- Better coverage in remote areas
- Historical and real-time data
- High accuracy

**Pricing**: Enterprise pricing

### 6. APRS.fi (Amateur Radio-based)
**Website**: https://aprs.fi/

**Coverage**: Limited, depends on amateur radio coverage
**Access**: Free
**Note**: Not reliable for commercial use

## Integration Strategy

### Recommended Approach: Hybrid System

1. **Primary Source**: MarineTraffic or VesselFinder API
   - Most reliable for Caspian Sea
   - Good vessel coverage
   - Regular updates

2. **Fallback**: AISHub (free tier)
   - Use when primary source is unavailable
   - Lower update frequency acceptable

3. **Current Simulation**: 
   - Keep existing simulation for development/testing
   - Use real data in production

### Implementation Steps

#### Step 1: Register for API Access
```bash
# Example: MarineTraffic
1. Visit https://www.marinetraffic.com/en/ais-api-services
2. Register for API key
3. Select appropriate plan
4. Get API credentials
```

#### Step 2: Create AIS Data Service
Create `backend/src/services/aisDataProvider.ts`:

```typescript
import axios from 'axios';

interface AISDataConfig {
  provider: 'marinetraffic' | 'vesselfinder' | 'aishub';
  apiKey: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  updateInterval: number;
}

export class AISDataProvider {
  private config: AISDataConfig;
  
  async fetchVessels() {
    // Implementation for real API calls
  }
}
```

#### Step 3: Update Environment Variables
Add to `.env`:
```bash
AIS_PROVIDER=marinetraffic
AIS_API_KEY=your_api_key_here
AIS_USE_REAL_DATA=true
AIS_SIMULATION_FALLBACK=true
```

#### Step 4: Modify Backend to Use Real Data
Update `backend/src/index.ts` to switch between simulation and real data based on configuration.

## Data Format Standardization

All AIS sources should be normalized to this format:
```typescript
interface VesselPosition {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  speed: number; // knots
  course: number; // degrees
  heading: number; // degrees
  timestamp: Date;
  vesselType: number;
  destination?: string;
  eta?: Date;
}
```

## Cost Estimation

### Monthly Costs (Approximate)
- **MarineTraffic Basic**: $100-500/month
- **VesselFinder**: $200-800/month (custom pricing)
- **Spire Maritime**: $1000+/month (enterprise)
- **AISHub**: Free-$50/month

### Recommendation for Small Project
Start with:
1. **Development**: Use simulation (current setup) - $0
2. **Testing**: AISHub free tier - $0
3. **Production**: MarineTraffic Basic - $100-200/month

## Testing Real AIS Data

### Quick Test with AISHub (Free)
```bash
# Register at aishub.net and get API key
curl "http://data.aishub.net/ws.php?username=YOUR_USERNAME&format=1&output=json&compress=0&latmin=38.5&latmax=41.5&lonmin=47.5&lonmax=50.5"
```

### Response Example:
```json
[
  {
    "MMSI": 412345678,
    "TIME": "2024-01-15 10:30:00",
    "LATITUDE": 40.123,
    "LONGITUDE": 49.456,
    "COG": 235,
    "SOG": 12.3,
    "HEADING": 238,
    "NAVSTAT": 0,
    "NAME": "CASPIAN STAR",
    "TYPE": 70
  }
]
```

## Legal Considerations

1. **Commercial Use**: Most services require commercial licensing
2. **Data Attribution**: Check if you need to display provider attribution
3. **Rate Limits**: Respect API rate limits to avoid service interruption
4. **Data Privacy**: Comply with maritime data usage regulations

## Current Simulation vs Real Data

| Feature | Simulation | Real AIS Data |
|---------|-----------|---------------|
| Cost | Free | $0-1000+/month |
| Accuracy | Realistic but fake | Actual vessel positions |
| Coverage | Configurable | Depends on provider |
| Reliability | 100% | Depends on provider |
| Development | Ideal | Requires API keys |
| Testing | Perfect | May have delays |

## Conclusion

For the **development phase**, continue using the simulation with Caspian Sea coordinates (already configured).

For **production deployment**, integrate MarineTraffic API or VesselFinder with the simulation as fallback.

## Next Steps

1. ✅ Use simulation for development (already configured)
2. Register for AISHub free tier for initial testing
3. Evaluate data quality and coverage
4. If satisfied, upgrade to commercial API (MarineTraffic/VesselFinder)
5. Implement hybrid system with simulation fallback