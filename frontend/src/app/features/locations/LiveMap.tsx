import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Truck, Target, RefreshCw, MapPin as MapPinIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import { api } from '@/app/lib/api/client';
import { MapView } from '@/app/components/map/MapView';
import { Button } from '@/app/components/ui/Button';
import { useLiveAlerts } from '@/app/components/ui/LiveAlertsPortal';
import type { Geofence, Vehicle, GeofenceEventInfo, LocationResponse } from '@/app/lib/types';

export function LiveMap() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [autoCenter, setAutoCenter] = useState(false);
  const [lastSimulation, setLastSimulation] = useState<{ lat: number; lng: number; result: LocationResponse | null; error: string | null } | null>(null);
  const { alerts: liveAlerts } = useLiveAlerts();

  const simulateLocationMutation = useMutation({
    mutationFn: ({ vehicleId, lat, lng }: { vehicleId: string; lat: number; lng: number }) =>
      api.updateLocation({ vehicle_id: vehicleId, latitude: lat, longitude: lng }),
    onSuccess: (result) => {
      setLastSimulation({ lat: result.latitude, lng: result.longitude, result, error: null });
      // Invalidate queries to refresh vehicle location
      // Note: react-query cache invalidation would require queryClient, skipping for simplicity
    },
    onError: (error: Error) => {
      setLastSimulation({ lat: 0, lng: 0, result: null, error: error.message });
    },
  });

  const handleMapClick = (latLng: [number, number], vehicleId: string) => {
    simulateLocationMutation.mutate({ vehicleId, lat: latLng[0], lng: latLng[1] });
  };

  const { data: geofencesData, isLoading: geofencesLoading } = useQuery({
    queryKey: ['geofences', { limit: 100 }],
    queryFn: () => api.getGeofences({ limit: 100 }),
  });

  const { data: vehiclesData, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => api.getVehicles({ limit: 100 }),
    refetchInterval: 10000,
  });

  const { data: currentLocation } = useQuery({
    queryKey: ['currentLocation', selectedVehicleId],
    queryFn: () => selectedVehicleId ? api.getCurrentLocation(selectedVehicleId) : null,
    enabled: !!selectedVehicleId,
    refetchInterval: 5000,
  });

  const geofences = geofencesData?.data || [];
  const vehicles = vehiclesData?.data || [];
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  const recentEvents: GeofenceEventInfo[] = liveAlerts
    .slice(0, 10)
    .map(a => ({
      geofence_id: a.geofenceId,
      geofence_name: a.geofenceName,
      category: a.category,
      event_type: a.eventType,
    }));

  const vehicleIcons: Record<string, string> = {
    truck: '🚛',
    bus: '🚌',
    van: '🚐',
    motorcycle: '🏍️',
    car: '🚗',
  };

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id);
  };

  const handleGeofenceClick = (geofence: Geofence) => {
    console.log('Geofence clicked:', geofence);
  };

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Map</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time vehicle tracking & geofence monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showGeofences} onChange={e => setShowGeofences(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Geofences</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showVehicles} onChange={e => setShowVehicles(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicles</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Events</span>
            </label>
          </div>
          <Button variant="outline" onClick={() => refetchVehicles()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setAutoCenter(!autoCenter)}>
            <Target className="h-4 w-4" />
            {autoCenter ? 'Auto-center On' : 'Auto-center Off'}
          </Button>
        </div>
      </div>

      {lastSimulation && (
        <div className={cn('mb-4 p-3 rounded-lg border text-sm', lastSimulation.error ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300')}>
          <div className="flex items-center gap-2">
            {lastSimulation.error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <MapPinIcon className="h-4 w-4" />
            )}
            <span className="font-medium">
              {lastSimulation.error ? 'Simulation Failed' : 'Location Sent'}
            </span>
          </div>
          <div className="mt-1 font-mono text-xs">
            {lastSimulation.error
              ? `Error: ${lastSimulation.error}`
              : `Lat: ${lastSimulation.lat?.toFixed(6)}, Lng: ${lastSimulation.lng?.toFixed(6)}` +
                (lastSimulation.result?.geofence_names?.length
                  ? ` | Inside: ${lastSimulation.result.geofence_names.join(', ')}`
                  : ' | Outside all geofences') +
                (lastSimulation.result?.entered?.length
                  ? ` | Entered: ${lastSimulation.result.entered.map(e => e.geofence_name).join(', ')}`
                  : '') +
                (lastSimulation.result?.exited?.length
                  ? ` | Exited: ${lastSimulation.result.exited.map(e => e.geofence_name).join(', ')}`
                  : '')
            }
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="lg:w-1/4 flex-shrink-0 overflow-y-auto space-y-4">
          {showVehicles && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary-600" />
                Vehicles ({vehicles.filter(v => v.status === 'active').length} active)
              </h3>
              {vehiclesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              ) : vehicles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No vehicles registered</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleVehicleClick(v)}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3',
                        selectedVehicleId === v.id
                          ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                      )}
                    >
                      <span className="text-2xl">{vehicleIcons[v.vehicle_type] || '🚗'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{v.vehicle_number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{v.driver_name}</p>
                      </div>
                      <span className={cn(
                        'px-1.5 py-0.5 text-xs rounded-full',
                        v.status === 'active' ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300' : 'bg-gray-100 text-gray-700'
                      )}>
                        {v.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showGeofences && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-success-600" />
                Geofences ({geofences.length})
              </h3>
              {geofencesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              ) : geofences.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No geofences created</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {geofences.map(gf => (
                    <button
                      key={gf.id}
                      onClick={() => handleGeofenceClick(gf)}
                      className="w-full p-3 rounded-lg text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded-full', gf.category === 'restricted_zone' ? 'bg-danger-500' : gf.category === 'danger_zone' ? 'bg-warning-500' : gf.category === 'safe_zone' ? 'bg-success-500' : 'bg-primary-500')} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{gf.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{gf.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedVehicle && currentLocation && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary-600" />
                Selected Vehicle
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Coordinates</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number'
                      ? `${currentLocation.latitude?.toFixed(6)}, ${currentLocation.longitude?.toFixed(6)}`
                      : 'N/A'}
                  </p>
                </div>
                {currentLocation?.geofence_names?.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inside Geofences</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentLocation.geofence_names.map(name => (
                        <span key={name} className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full dark:bg-primary-900/30 dark:text-primary-300">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Update</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {currentLocation.recorded_at
                      ? new Date(currentLocation.recorded_at).toLocaleTimeString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <MapView
            geofences={showGeofences ? geofences : []}
            vehicles={showVehicles ? vehicles : []}
            selectedVehicle={selectedVehicle || undefined}
            currentLocation={currentLocation || undefined}
            recentEvents={showEvents ? recentEvents : []}
            autoCenter={autoCenter}
            onVehicleClick={handleVehicleClick}
            onGeofenceClick={handleGeofenceClick}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}