// Map Configuration
export interface MapConfig {
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Map Layers
export interface MapLayer {
  id: string;
  name: string;
  type: 'base' | 'overlay' | 'data';
  visible: boolean;
  opacity: number;
  url?: string;
  options?: any;
}

export interface BaseMapLayer extends MapLayer {
  type: 'base';
  url: string;
  attribution: string;
  maxZoom: number;
}

export interface OverlayLayer extends MapLayer {
  type: 'overlay';
  data?: any;
  style?: any;
}

// Map Controls
export interface MapControls {
  zoom: boolean;
  layers: boolean;
  fullscreen: boolean;
  measure: boolean;
  draw: boolean;
  search: boolean;
}

// Map Markers
export interface MapMarker {
  id: string;
  position: {
    latitude: number;
    longitude: number;
  };
  type: 'vessel' | 'alert' | 'port' | 'custom';
  icon?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  visible: boolean;
  selected: boolean;
  data?: any;
  popup?: {
    title: string;
    content: string;
    actions?: Array<{
      label: string;
      action: string;
    }>;
  };
}

// Vessel Marker
export interface VesselMarker extends MapMarker {
  type: 'vessel';
  vessel: Vessel;
  course?: number;
  speed?: number;
  heading?: number;
  status?: number;
  alertLevel?: AlertLevel;
  track?: VesselTrack;
}

// Alert Marker
export interface AlertMarker extends MapMarker {
  type: 'alert';
  alert: CollisionAlert;
  severity: AlertLevel;
  predictedPath?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

// Map Events
export interface MapEvent {
  type: 'click' | 'zoom' | 'move' | 'marker-click' | 'marker-hover';
  position?: {
    latitude: number;
    longitude: number;
  };
  marker?: MapMarker;
  data?: any;
}

// Map Viewport
export interface MapViewport {
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  pitch?: number;
  bearing?: number;
}

// Map Tools
export interface MapTool {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  enabled: boolean;
  cursor?: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

// Measurement Tool
export interface MeasurementTool extends MapTool {
  type: 'distance' | 'area' | 'bearing';
  units: 'metric' | 'nautical' | 'imperial';
  precision: number;
}

// Drawing Tool
export interface DrawingTool extends MapTool {
  type: 'point' | 'line' | 'polygon' | 'circle' | 'rectangle';
  style: {
    color: string;
    weight: number;
    opacity: number;
    fillOpacity: number;
  };
}

// Map Search
export interface MapSearchResult {
  id: string;
  name: string;
  type: 'vessel' | 'port' | 'location' | 'coordinate';
  position: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  data?: any;
}

// Map Styles
export interface MapStyle {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  attribution: string;
}

// Heatmap Data
export interface HeatmapData {
  points: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
  }>;
  radius: number;
  blur: number;
  maxZoom: number;
  gradient?: Record<number, string>;
}

// Import other types
import type { Vessel, VesselTrack } from './vessel';
import type { CollisionAlert, AlertLevel } from './alert';