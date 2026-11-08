export interface Geofence {
  id: string;
  name: string;
  description?: string;
  coordinates: number[][];
  category: GeofenceCategory;
  created_at: string;
}

export type GeofenceCategory = 'general' | 'restricted_zone' | 'danger_zone' | 'safe_zone' | 'custom';

export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  coordinates: number[][];
  category: GeofenceCategory;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: VehicleType;
  phone: string;
  status: VehicleStatus;
  created_at: string;
}

export type VehicleType = 'car' | 'truck' | 'bus' | 'motorcycle' | 'van';
export type VehicleStatus = 'active' | 'inactive' | 'maintenance';

export interface CreateVehicleRequest {
  vehicle_number: string;
  driver_name: string;
  vehicle_type: VehicleType;
  phone: string;
}

export interface UpdateVehicleStatusRequest {
  status: VehicleStatus;
}

export interface LocationUpdateRequest {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface LocationResponse {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  geofence_ids: string[];
  geofence_names: string[];
  entered: GeofenceEventInfo[];
  exited: GeofenceEventInfo[];
  recorded_at: string;
}

export interface GeofenceEventInfo {
  geofence_id: string;
  geofence_name: string;
  category: string;
  event_type: 'entry' | 'exit';
}

export interface CurrentLocationResponse {
  vehicle_id: string;
  vehicle_number: string;
  latitude?: number;
  longitude?: number;
  geofence_ids: string[];
  geofence_names: string[];
  recorded_at: string;
}

export interface AlertRule {
  id: string;
  geofence_id: string;
  vehicle_id?: string;
  event_type: 'entry' | 'exit' | 'both';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notify_via_websocket: boolean;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CreateAlertRuleRequest {
  geofence_id: string;
  vehicle_id?: string;
  event_type: 'entry' | 'exit' | 'both';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  notify_via_websocket?: boolean;
}

export interface Violation {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  event_type: 'entry' | 'exit';
  latitude: number;
  longitude: number;
  occurred_at: string;
}

export interface ViolationFilters {
  vehicle_id?: string;
  geofence_id?: string;
  event_type?: 'entry' | 'exit';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface WebSocketAlert {
  type: 'alert';
  payload: {
    vehicle_id: string;
    vehicle_number: string;
    geofence_id: string;
    geofence_name: string;
    event_type: 'entry' | 'exit';
    category: string;
    severity: string;
    timestamp: string;
  };
}

export interface APIError {
  error: string;
  time_ns: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  time_ns: string;
}