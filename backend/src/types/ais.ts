/**
 * AIS (Automatic Identification System) Types and Interfaces
 * Based on ITU-R M.1371-5 standard
 */

export interface AISPosition {
  latitude: number;
  longitude: number;
  accuracy?: boolean; // Position accuracy
}

export interface AISVesselDynamic {
  mmsi: number; // Maritime Mobile Service Identity
  position: AISPosition;
  course?: number; // Course over ground (degrees 0-359)
  speed?: number; // Speed over ground (knots)
  heading?: number; // True heading (degrees 0-359)
  timestamp: Date;
  status?: number; // Navigational status (0-15)
  rot?: number; // Rate of turn
}

export interface AISVesselStatic {
  mmsi: number;
  name?: string; // Vessel name (max 20 characters)
  callSign?: string; // Call sign (max 7 characters)
  vesselType?: number; // AIS vessel type (1-99)
  dimension?: {
    length: number; // Length in meters
    width: number; // Width in meters
    bow?: number; // Distance from bow to reference point
    stern?: number; // Distance from stern to reference point
    port?: number; // Distance from port side to reference point
    starboard?: number; // Distance from starboard side to reference point
  };
  draught?: number; // Draught in meters
  destination?: string; // Destination (max 20 characters)
  eta?: Date; // Estimated time of arrival
  imo?: number; // IMO number
}

export interface Vessel extends AISVesselDynamic, AISVesselStatic {
  id: string; // Internal unique identifier
  lastUpdate: Date;
  source: 'AIS'; // Data source
}

export interface AISMessage {
  type: number; // AIS message type (1-27)
  mmsi: number;
  raw: string; // Raw NMEA sentence
  timestamp: Date;
  data: any; // Parsed data specific to message type
}

export interface AISNMEASentence {
  prefix: string; // '!AIVDM' or '!AIVDO'
  totalFragments: number;
  fragmentNumber: number;
  sequenceId?: number;
  channel: 'A' | 'B';
  payload: string;
  checksum: string;
}

// AIS Message Types
export enum AISMessageType {
  POSITION_REPORT_CLASS_A_SCHEDULED = 1,
  POSITION_REPORT_CLASS_A_ASSIGNED = 2,
  POSITION_REPORT_CLASS_A_RESPONSE = 3,
  BASE_STATION_REPORT = 4,
  STATIC_AND_VOYAGE_DATA = 5,
  BINARY_ACKNOWLEDGE_MESSAGE = 7,
  BINARY_BROADCAST_MESSAGE = 8,
  STANDARD_SAR_AIRCRAFT_POSITION_REPORT = 9,
  UTC_AND_DATE_INQUIRY = 10,
  UTC_AND_DATE_RESPONSE = 11,
  ADDRESSED_SAFETY_RELATED_MESSAGE = 12,
  SAFETY_RELATED_ACKNOWLEDGEMENT = 13,
  SAFETY_RELATED_BROADCAST_MESSAGE = 14,
  INTERROGATION = 15,
  ASSIGNMENT_MODE_COMMAND = 16,
  DGNSS_BROADCAST_BINARY_MESSAGE = 17,
  STANDARD_CLASS_B_CS_POSITION_REPORT = 18,
  EXTENDED_CLASS_B_CS_POSITION_REPORT = 19,
  DATA_LINK_MANAGEMENT_MESSAGE = 20,
  AID_TO_NAVIGATION_REPORT = 21,
  CHANNEL_MANAGEMENT = 22,
  GROUP_ASSIGNMENT_COMMAND = 23,
  STATIC_DATA_REPORT = 24,
  SINGLE_SLOT_BINARY_MESSAGE = 25,
  MULTIPLE_SLOT_BINARY_MESSAGE = 26,
  POSITION_REPORT_FOR_LONG_RANGE_APPLICATIONS = 27
}

// Navigational Status Values
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

// Vessel Type Categories
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

export interface AISParserResult {
  success: boolean;
  message?: AISMessage;
  error?: string;
  warnings?: string[];
}