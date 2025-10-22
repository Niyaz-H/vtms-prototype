# Suspicious Activity Detection System - Implementation Summary

## Overview
This document summarizes the implementation of the suspicious activity detection and enhanced alert management system.

## 1. Backend Implementation

### 1.1 New Services

- **`activityDetection.ts`**: Orchestrates all detection services, manages the detection lifecycle, and creates alerts.
- **`alertManager.ts`**: Manages the lifecycle of alerts, including states (new, acknowledged, investigating, resolved), history, and statistics.
- **`rendezvousDetector.ts`**: Detects suspicious meetings between vessels based on proximity, duration, and speed.
- **`loiteringDetector.ts`**: Detects vessels staying in a small area for an extended period.

### 1.2 New Type Definitions (`activity.ts`)

- **`AlertState`**: Enum for alert lifecycle states.
- **`ActivityType`**: Enum for different types of suspicious activities.
- **`SuspiciousActivity`**: Interface for a unified alert structure.
- **`RendezvousEvent`**: Data structure for rendezvous events.
- **`LoiteringEvent`**: Data structure for loitering events.

### 1.3 System Integration (`index.ts`)

- The `activityDetection` service is initialized and started with the server.
- A new interval is set to run the detection algorithms every 30 seconds.
- New WebSocket events are emitted for suspicious activities (`suspicious_activities`) and detection statistics (`activity_stats`).

## 2. New WebSocket Events

- **`suspicious_activities`**: Emits an array of pending suspicious activity alerts.
- **`activity_stats`**: Emits statistics about the activity detection system.

## 3. Next Steps (Frontend)

- Update frontend type definitions to match the new backend types.
- Enhance the `AlertManagement` page to display the new alert types and allow for lifecycle actions (e.g., acknowledge, resolve).
- Implement a real-time notification system to display new alerts as they arrive.
- Add visualizations for rendezvous and loitering events on the map.

## 4. How to Test

- Run the backend server.
- Observe the console for logs related to activity detection.
- Connect a WebSocket client and listen for the `suspicious_activities` and `activity_stats` events.
- The simulation will automatically generate scenarios that trigger rendezvous and loitering events.