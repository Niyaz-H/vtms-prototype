# Alert Management & Suspicious Activity Detection System - Implementation Plan

## Overview
Enhanced alert system with user acknowledgment workflow and intelligent detection of suspicious maritime activities.

## 1. Alert Management System

### 1.1 Alert Lifecycle & States
```typescript
enum AlertState {
  NEW = 'new',                    // Just created, needs attention
  ACKNOWLEDGED = 'acknowledged',   // User has seen it
  INVESTIGATING = 'investigating', // Under active investigation
  RESOLVED = 'resolved',          // Issue resolved
  FALSE_POSITIVE = 'false_positive', // Marked as false alarm
  ESCALATED = 'escalated'         // Escalated to authorities
}
```

### 1.2 Alert Actions
- **Acknowledge**: Mark as seen (doesn't dismiss)
- **Investigate**: Start investigation workflow
- **Resolve**: Close with resolution notes
- **Escalate**: Forward to authorities/higher level
- **Mark False Positive**: Tag as false alarm for ML training

### 1.3 Alert Priority Queue
- Auto-stack similar alerts
- Group by vessel pairs
- Priority scoring based on:
  - Alert level (critical > danger > warning)
  - Time elapsed since creation
  - Historical false positive rate
  - Vessel importance/flagging

## 2. Suspicious Activity Detection

### 2.1 Rendezvous Detection (Contraband/Illegal Transfer)
**Pattern**: Two vessels approach closely, stop/slow down, then depart

**Detection Criteria**:
- Distance < 0.5 NM for > 5 minutes
- Both vessels speed < 3 knots during encounter
- Vessels previously separated by > 5 NM
- Both vessels resume normal speed after
- Meeting location away from ports/anchorages

**Alert Type**: `SUSPICIOUS_RENDEZVOUS`
**Severity**: High
**Data Captured**:
- Meeting coordinates
- Duration of proximity
- Speed profiles before/during/after
- Vessel types and flags
- Historical meeting frequency

### 2.2 Loitering Detection
**Pattern**: Vessel stays in same area for extended period without purpose

**Detection Criteria**:
- Stationary or slow (<3 knots) for > 2 hours
- Not in designated anchorage area
- Not a fishing vessel in fishing grounds
- Circular or erratic movement pattern
- Away from ports and normal routes

**Alert Type**: `SUSPICIOUS_LOITERING`
**Severity**: Medium
**Use Cases**: Smuggling staging, surveillance, illegal fishing

### 2.3 AIS Manipulation Detection
**Pattern**: Suspicious AIS behavior indicating tampering

**Detection Criteria**:
- Sudden large jumps in position (teleporting)
- Speed > physically possible for vessel type
- Transmitting from impossible location (land)
- AIS off for extended period then reappears
- Multiple vessels with same MMSI

**Alert Type**: `AIS_MANIPULATION`
**Severity**: Critical

### 2.4 Forbidden Zone Violation
**Pattern**: Vessel enters restricted/prohibited areas

**Detection Criteria**:
- Entry into territorial waters without clearance
- Entry into military zones
- Entry into protected marine areas
- Crossing borders without authorization

**Alert Type**: `ZONE_VIOLATION`
**Severity**: High

### 2.5 Dark Vessel Detection
**Pattern**: Vessel with AIS transponder turned off

**Detection Criteria**:
- Known vessel stops transmitting AIS
- AIS off for > 30 minutes in monitored area
- Vessel was previously tracked
- High-risk vessel profile

**Alert Type**: `DARK_VESSEL`
**Severity**: Critical

### 2.6 Unusual Speed Pattern
**Pattern**: Sudden significant speed changes

**Detection Criteria**:
- Speed increase/decrease > 10 knots in < 5 min
- Speed oscillation pattern
- Speed inconsistent with vessel type

**Alert Type**: `SPEED_ANOMALY`
**Severity**: Low

### 2.7 Course Deviation
**Pattern**: Significant deviation from filed route/normal pattern

**Detection Criteria**:
- Course change > 45° from expected
- Multiple zigzag patterns
- Deviation from historical routes
- Heading toward known smuggling routes

**Alert Type**: `COURSE_DEVIATION`
**Severity**: Medium

## 3. Backend Implementation

### 3.1 New Services
```
backend/src/services/
├── activityDetection.ts      # Main detection engine
├── rendezvousDetector.ts     # Detect vessel meetings
├── loiteringDetector.ts      # Detect stationary patterns
├── aisAnomalyDetector.ts     # AIS manipulation detection
├── alertManager.ts           # Alert lifecycle management
└── patternAnalyzer.ts        # Historical pattern analysis
```

### 3.2 Data Structures
```typescript
interface SuspiciousActivity {
  id: string
  type: ActivityType
  severity: 'low' | 'medium' | 'high' | 'critical'
  vessels: string[] // MMSIs
  detectedAt: Date
  location: Coordinates
  evidence: {
    description: string
    metrics: Record<string, number>
    timeline: ActivityEvent[]
  }
  state: AlertState
  assignedTo?: string
  notes: string[]
  attachments: string[]
}
```

### 3.3 Detection Engine
- Runs every 30 seconds
- Analyzes vessel history (last 2 hours)
- Pattern matching algorithms
- ML-ready data collection
- Configurable thresholds

## 4. Frontend Implementation

### 4.1 Alert Management UI
**Components**:
- Alert notification center with badge count
- Alert priority queue viewer
- Alert detail modal with timeline
- Quick action buttons
- Investigation workspace

**Features**:
- Real-time notifications
- Sound alerts for critical events
- Desktop notifications
- Alert filtering and search
- Bulk actions (acknowledge multiple)
- Export reports

### 4.2 Activity Timeline
- Visual timeline of suspicious events
- Vessel track playback
- Meeting point visualization
- Speed/course graphs
- Photo/video evidence attachment

### 4.3 Investigation Tools
- Side-by-side vessel comparison
- Historical route overlay
- Communication with authorities
- Evidence collection forms
- Report generation

## 5. API Endpoints

```typescript
// Alert Management
POST   /api/alerts/:id/acknowledge
POST   /api/alerts/:id/investigate
POST   /api/alerts/:id/resolve
POST   /api/alerts/:id/escalate
POST   /api/alerts/:id/false-positive
GET    /api/alerts/pending
GET    /api/alerts/history

// Activity Detection
GET    /api/activities/suspicious
GET    /api/activities/rendezvous
GET    /api/activities/loitering
GET    /api/vessels/:mmsi/activity-history
POST   /api/activities/:id/report
```

## 6. Configuration

### 6.1 Detection Parameters
```json
{
  "rendezvous": {
    "proximityThreshold": 0.5,    // NM
    "durationThreshold": 300,      // seconds
    "speedThreshold": 3.0          // knots
  },
  "loitering": {
    "durationThreshold": 7200,     // seconds
    "speedThreshold": 3.0,         // knots
    "radiusThreshold": 0.2         // NM
  },
  "aisAnomaly": {
    "maxJumpDistance": 5.0,        // NM
    "maxSpeedForType": {
      "cargo": 25,
      "tanker": 20
    }
  }
}
```

## 7. Database Schema Updates

```sql
-- Activity detections table
CREATE TABLE suspicious_activities (
  id UUID PRIMARY KEY,
  type VARCHAR(50),
  severity VARCHAR(20),
  state VARCHAR(30),
  detected_at TIMESTAMP,
  location POINT,
  vessels TEXT[],
  evidence JSONB,
  assigned_to VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Alert actions log
CREATE TABLE alert_actions (
  id UUID PRIMARY KEY,
  alert_id UUID,
  action VARCHAR(50),
  performed_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP
);
```

## 8. Implementation Phases

### Phase 1: Alert Management (Week 1)
- [ ] Update alert types and states
- [ ] Implement alert lifecycle API
- [ ] Create alert management UI
- [ ] Add notification system

### Phase 2: Rendezvous Detection (Week 2)
- [ ] Implement proximity tracking
- [ ] Build rendezvous detector
- [ ] Add visualization
- [ ] Test with simulated scenarios

### Phase 3: Additional Detectors (Week 3)
- [ ] Loitering detection
- [ ] AIS anomaly detection
- [ ] Speed/course anomalies
- [ ] Integration testing

### Phase 4: Investigation Tools (Week 4)
- [ ] Investigation workspace
- [ ] Report generation
- [ ] Evidence management
- [ ] Authority integration

## 9. Testing Strategy

### 9.1 Simulation Scenarios
- Create test vessels that perform suspicious patterns
- Automated detection validation
- False positive rate monitoring
- Performance benchmarking

### 9.2 User Acceptance Testing
- Alert workflow testing
- UI/UX validation
- Response time measurement
- Documentation review

## 10. Future Enhancements

- Machine learning for pattern recognition
- Predictive analytics
- Integration with external databases (vessel registries, sanctions lists)
- Satellite imagery integration
- Weather correlation analysis
- Automatic report generation
- Mobile app for field officers
- Integration with coast guard systems