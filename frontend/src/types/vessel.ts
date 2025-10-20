// Vessel position and navigation
export interface VesselPosition {
  latitude: number;
  longitude: number;
  accuracy?: boolean;
}

export interface VesselDimension {
  length: number;
  width: number;
  bow?: number;
  stern?: number;
  port?: number;
  starboard?: number;
}

// Main Vessel interface
export interface Vessel {
  id: string;
  mmsi: number;
  name?: string;
  callSign?: string;
  vesselType?: number;
  position: VesselPosition;
  course?: number; // Course over ground (degrees 0-359)
  speed?: number; // Speed over ground (knots)
  heading?: number; // True heading (degrees 0-359)
  status?: number; // Navigational status
  timestamp: string; // ISO string
  lastUpdate: string; // ISO string
  source: 'AIS';
  dimension?: VesselDimension;
  draught?: number;
  destination?: string;
  eta?: string;
  imo?: number;
  rot?: number; // Rate of turn
}

// Vessel UI Extensions
export interface VesselUI extends Vessel {
  selected?: boolean;
  visible?: boolean;
  opacity?: number;
  color?: string;
  icon?: string;
  age?: number; // Age of last position update in seconds
  alerts?: CollisionAlert[];
}

// Vessel Types
export enum VesselTypeCategory {
  FISHING = 30,
  TOWING = 31,
  TOWING_LARGE = 32,
  DREDGING = 33,
  DIVING = 34,
  MILITARY = 35,
  SAILING = 36,
  PLEASURE = 37,
  HIGH_SPEED = 40,
  PILOT = 50,
  SAR = 51,
  TUG = 52,
  PORT_TENDER = 53,
  ANTI_POLLUTION = 54,
  LAW_ENFORCEMENT = 55,
  MEDICAL = 58,
  NON_COMBATANT = 59,
  PASSENGER = 60,
  CARGO = 70,
  TANKER = 80,
  OTHER = 90
}

// Navigational Status
export enum NavigationalStatus {
  UNDER_WAY_USING_ENGINE = 0,
  AT_ANCHOR = 1,
  NOT_UNDER_COMMAND = 2,
  RESTRICTED_MANEUVERABILITY = 3,
  CONSTRAINED_BY_DRAUGHT = 4,
  MOORED = 5,
  AGROUND = 6,
  ENGAGED_IN_FISHING = 7,
  UNDER_WAY_SAILING = 8,
  AIS_SART_IS_ACTIVE = 14,
  NOT_DEFINED = 15
}

// Vessel Filters
export interface VesselFilters {
  search?: string;
  vesselTypes?: number[];
  status?: number[];
  speedRange?: {
    min?: number;
    max?: number;
  };
  area?: BoundingBox;
  showAlertsOnly?: boolean;
  showSelectedOnly?: boolean;
}

// Vessel Statistics
export interface VesselStats {
  total: number;
  byType: Record<number, number>;
  byStatus: Record<number, number>;
  averageSpeed: number;
  alertsCount: number;
  lastUpdate: string;
}

// Vessel History
export interface VesselHistoryPoint {
  mmsi: number;
  latitude: number;
  longitude: number;
  course?: number;
  speed?: number;
  heading?: number;
  status?: number;
  timestamp: string;
}

export interface VesselHistory {
  mmsi: number;
  vessel: Vessel;
  points: VesselHistoryPoint[];
  startTime: string;
  endTime: string;
  totalDistance: number; // in nautical miles
  averageSpeed: number;
}

// Vessel Track
export interface VesselTrack {
  mmsi: number;
  points: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    course?: number;
    speed?: number;
  }>;
  color: string;
  visible: boolean;
  animated?: boolean;
}

// Import other types
import type { BoundingBox } from './api';
import type { CollisionAlert } from './alert';