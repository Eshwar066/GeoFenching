import type {
  Geofence,
  CreateGeofenceRequest,
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleStatusRequest,
  LocationUpdateRequest,
  LocationResponse,
  CurrentLocationResponse,
  AlertRule,
  CreateAlertRuleRequest,
  Violation,
  ViolationFilters,
  PaginatedResponse,
} from '@/lib/types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

// Geofences
export async function getGeofences(params?: { category?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<Geofence>> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.limit) search.set('limit', params.limit.toString());
  if (params?.offset) search.set('offset', params.offset.toString());
  const query = search.toString() ? `?${search.toString()}` : '';
  const response = await fetchJson<{ data: { geofences: Geofence[]; limit: number; offset: number; total: number }; time_ns: string }>(`${API_BASE}/geofences${query}`);
  return {
    data: response.data.geofences,
    total: response.data.total,
    limit: response.data.limit,
    offset: response.data.offset,
  };
}

export async function createGeofence(data: CreateGeofenceRequest): Promise<Geofence> {
  const response = await fetchJson<{ data: Geofence; time_ns: string }>(`${API_BASE}/geofences`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function getGeofence(id: string): Promise<Geofence> {
  const response = await fetchJson<{ data: Geofence; time_ns: string }>(`${API_BASE}/geofences/${id}`);
  return response.data;
}

export async function deleteGeofence(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/geofences/${id}`, { method: 'DELETE' });
}

// Vehicles
export async function getVehicles(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Vehicle>> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', params.limit.toString());
  if (params?.offset) search.set('offset', params.offset.toString());
  const query = search.toString() ? `?${search.toString()}` : '';
  const response = await fetchJson<{ data: { vehicles: Vehicle[]; limit: number; offset: number; total: number }; time_ns: string }>(`${API_BASE}/vehicles${query}`);
  return {
    data: response.data.vehicles,
    total: response.data.total,
    limit: response.data.limit,
    offset: response.data.offset,
  };
}

export async function createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
  const response = await fetchJson<{ data: Vehicle; time_ns: string }>(`${API_BASE}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await fetchJson<{ data: Vehicle; time_ns: string }>(`${API_BASE}/vehicles/${id}`);
  return response.data;
}

export async function updateVehicleStatus(id: string, data: UpdateVehicleStatusRequest): Promise<{ status: string }> {
  const response = await fetchJson<{ data: { status: string }; time_ns: string }>(`${API_BASE}/vehicles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
}

// Location
export async function updateLocation(data: LocationUpdateRequest): Promise<LocationResponse> {
  const response = await fetchJson<{ data: LocationResponse; time_ns: string }>(`${API_BASE}/vehicles/location`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function getCurrentLocation(vehicleId: string): Promise<CurrentLocationResponse> {
  const response = await fetchJson<{ data: CurrentLocationResponse; time_ns: string }>(`${API_BASE}/vehicles/location/${vehicleId}`);
  return response.data;
}

// Alerts
export async function getAlertRules(): Promise<PaginatedResponse<AlertRule>> {
  const response = await fetchJson<{ data: { alert_rules: AlertRule[]; total: number; limit: number; offset: number }; time_ns: string }>(`${API_BASE}/alerts`);
  return {
    data: response.data.alert_rules,
    total: response.data.total,
    limit: response.data.limit,
    offset: response.data.offset,
  };
}

export async function createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
  const response = await fetchJson<{ data: AlertRule; time_ns: string }>(`${API_BASE}/alerts/configure`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteAlertRule(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
}

// Violations
export async function getViolations(filters: ViolationFilters): Promise<PaginatedResponse<Violation>> {
  const search = new URLSearchParams();
  if (filters.vehicle_id) search.set('vehicle_id', filters.vehicle_id);
  if (filters.geofence_id) search.set('geofence_id', filters.geofence_id);
  if (filters.event_type) search.set('event_type', filters.event_type);
  if (filters.start_date) search.set('start_date', filters.start_date);
  if (filters.end_date) search.set('end_date', filters.end_date);
  if (filters.limit) search.set('limit', filters.limit.toString());
  if (filters.offset) search.set('offset', filters.offset.toString());
  const response = await fetchJson<{ data: { violations: Violation[]; limit: number; offset: number; total: number }; time_ns: string }>(`${API_BASE}/violations/history?${search.toString()}`);
  return {
    data: response.data.violations,
    total: response.data.total,
    limit: response.data.limit,
    offset: response.data.offset,
  };
}

// Health
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetchJson<{ data: { status: string }; time_ns: string }>(`${API_BASE}/health`);
  return response.data;
}

// Export all as api object for convenience
export const api = {
  getGeofences,
  createGeofence,
  getGeofence,
  deleteGeofence,
  getVehicles,
  createVehicle,
  getVehicle,
  updateVehicleStatus,
  deleteVehicle,
  updateLocation,
  getCurrentLocation,
  getAlertRules,
  createAlertRule,
  deleteAlertRule,
  getViolations,
  checkHealth,
};