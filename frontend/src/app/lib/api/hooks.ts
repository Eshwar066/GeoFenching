import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './client';
import type { ViolationFilters } from '@/lib/types';

// Query keys
export const queryKeys = {
  geofences: (params?: { category?: string; limit?: number; offset?: number }) =>
    ['geofences', params] as const,
  geofence: (id: string) => ['geofence', id] as const,
  vehicles: (params?: { limit?: number; offset?: number }) =>
    ['vehicles', params] as const,
  vehicle: (id: string) => ['vehicle', id] as const,
  currentLocation: (vehicleId: string) => ['currentLocation', vehicleId] as const,
  alerts: () => ['alerts'] as const,
  violations: (filters: ViolationFilters) => ['violations', filters] as const,
};

// Geofence hooks
export function useGeofences(params?: { category?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.geofences(params),
    queryFn: () => api.getGeofences(params),
  });
}

export function useGeofence(id: string) {
  return useQuery({
    queryKey: queryKeys.geofence(id),
    queryFn: () => api.getGeofence(id),
    enabled: !!id,
  });
}

export function useCreateGeofence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createGeofence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
}

// Vehicle hooks
export function useVehicles(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.vehicles(params),
    queryFn: () => api.getVehicles(params),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.vehicle(id),
    queryFn: () => api.getVehicle(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'active' | 'inactive' | 'maintenance' } }) =>
      api.updateVehicleStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Location hooks
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateLocation,
    onSuccess: (data: { vehicle_id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['currentLocation', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useCurrentLocation(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.currentLocation(vehicleId),
    queryFn: () => api.getCurrentLocation(vehicleId),
    enabled: !!vehicleId,
    refetchInterval: 5000,
  });
}

// Alert hooks
export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts(),
    queryFn: api.getAlertRules,
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Violation hooks
export function useViolations(filters: ViolationFilters) {
  return useQuery({
    queryKey: queryKeys.violations(filters),
    queryFn: () => api.getViolations(filters),
  });
}