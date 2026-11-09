import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import type { Geofence, Vehicle, CurrentLocationResponse, GeofenceEventInfo } from '@/app/lib/types';

function MapClickHandler({ selectedVehicle, onMapClick, setSimulateLocation }: {
  selectedVehicle: Vehicle | undefined | null;
  onMapClick: ((latLng: [number, number], vehicleId: string) => void) | undefined;
  setSimulateLocation: (loc: [number, number] | null) => void;
}) {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      if (!selectedVehicle || !onMapClick) return;
      const latLng = e.latlng;
      setSimulateLocation([latLng.lat, latLng.lng]);

      if (window.confirm(`Send location update for ${selectedVehicle.vehicle_number} to ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}?`)) {
        onMapClick([latLng.lat, latLng.lng], selectedVehicle.id);
      }
      setSimulateLocation(null);
    },
  });

  return null;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  geofences: Geofence[];
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  currentLocation?: CurrentLocationResponse | null;
  recentEvents?: GeofenceEventInfo[];
  center?: [number, number];
  zoom?: number;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onGeofenceClick?: (geofence: Geofence) => void;
  onMapClick?: (latLng: [number, number], vehicleId: string) => void;
}

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

const categoryColors: Record<string, { fill: string; border: string }> = {
  restricted_zone: { fill: '#fee2e2', border: '#dc2626' },
  danger_zone: { fill: '#fef3c7', border: '#d97706' },
  safe_zone: { fill: '#dcfce7', border: '#16a34a' },
  general: { fill: '#e0f2fe', border: '#0284c7' },
  custom: { fill: '#f3e8ff', border: '#9333ea' },
};

const primaryColors = { fill: '#dbeafe', border: '#2563eb' };

function GeofenceLayer({
  geofences,
  onClick,
  selectedId,
  onSelect,
  selectedVehicle,
}: {
  geofences: Geofence[];
  onClick?: (g: Geofence) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedVehicle?: Vehicle | null;
}) {
  return (
    <>
      {geofences.map((geofence) => {
        const isSelected = geofence.id === selectedId;
        const colors = isSelected ? primaryColors : (categoryColors[geofence.category] || categoryColors.general);
        const latLngs = geofence.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]);
        const isSimulationMode = selectedVehicle !== null;
        return (
          <>
            <Polygon
              key={geofence.id}
              positions={latLngs}
              pathOptions={{
                fillColor: colors.fill,
                color: colors.border,
                weight: isSelected ? 3 : 2,
                fillOpacity: isSelected ? 0.4 : 0.3,
                dashArray: isSelected ? undefined : '5, 5',
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  if (!isSimulationMode) {
                    e.originalEvent?.stopPropagation();
                    onSelect(geofence.id);
                    onClick?.(geofence);
                  }
                },
              }}
            >
              {!isSimulationMode && (
                <Popup className={isSelected ? 'leaflet-popup-primary' : ''}>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{geofence.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{geofence.category.replace('_', ' ')}</p>
                    {geofence.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{geofence.description}</p>
                    )}
                  </div>
                </Popup>
              )}
            </Polygon>
            {!isSimulationMode && (
              <style>{`
                .leaflet-popup-primary .leaflet-popup-content-wrapper {
                  background: #dbeafe;
                  border: 2px solid #2563eb;
                  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                }
                .leaflet-popup-primary .leaflet-popup-tip {
                  background: #dbeafe;
                  border: 2px solid #2563eb;
                  border-top: none;
                  border-left: none;
                }
                .leaflet-popup-primary .leaflet-popup-close-button {
                  color: #2563eb;
                }
                .leaflet-popup-primary .leaflet-popup-close-button:hover {
                  color: #1d4ed8;
                }
                :global(.dark) .leaflet-popup-primary .leaflet-popup-content-wrapper {
                  background: #1e3a5f;
                  border-color: #3b82f6;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                :global(.dark) .leaflet-popup-primary .leaflet-popup-tip {
                  background: #1e3a5f;
                  border-color: #3b82f6;
                }
                :global(.dark) .leaflet-popup-primary .leaflet-popup-close-button {
                  color: #60a5fa;
                }
                :global(.dark) .leaflet-popup-primary .leaflet-popup-close-button:hover {
                  color: #93c5fd;
                }
              `}</style>
            )}
          </>
        );
      })}
    </>
  );
}

function VehicleMarker({
  vehicle,
  location,
  isSelected,
  onClick,
}: {
  vehicle: Vehicle;
  location: CurrentLocationResponse | null;
  isSelected: boolean;
  onClick?: () => void;
}) {
  const position = (location && location.latitude !== undefined && location.longitude !== undefined)
    ? [location.latitude, location.longitude] as [number, number]
    : null;
  const isInsideGeofence = (location?.geofence_ids?.length ?? 0) > 0;

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={L.divIcon({
        className: cn(
          'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
          isSelected ? 'ring-2 ring-primary-500 ring-offset-2 scale-110' : '',
          isInsideGeofence ? 'bg-danger-100 border-danger-500' : 'bg-primary-100 border-primary-500'
        ),
        html: `<span class="text-primary-600 dark:text-primary-400">${vehicle.vehicle_type === 'truck' ? '🚛' : vehicle.vehicle_type === 'bus' ? '🚌' : vehicle.vehicle_type === 'van' ? '🚐' : vehicle.vehicle_type === 'motorcycle' ? '🏍️' : '🚗'}</span>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{vehicle.vehicle_type === 'truck' ? '🚛' : vehicle.vehicle_type === 'bus' ? '🚌' : vehicle.vehicle_type === 'van' ? '🚐' : vehicle.vehicle_type === 'motorcycle' ? '🏍️' : '🚗'}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{vehicle.vehicle_number}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.driver_name}</p>
            </div>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Status:</span> <span className={cn('px-1.5 py-0.5 rounded-full text-xs', vehicle.status === 'active' ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300' : 'bg-gray-100 text-gray-700')}>{vehicle.status}</span></p>
            <p><span className="font-medium">Type:</span> {vehicle.vehicle_type}</p>
            <p><span className="font-medium">Phone:</span> {vehicle.phone}</p>
            {location && location.latitude !== undefined && location.longitude !== undefined && (
              <>
                <p><span className="font-medium">Location:</span> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                {location.geofence_names?.length > 0 && (
                  <p><span className="font-medium">Inside:</span> {location.geofence_names.join(', ')}</p>
                )}
              </>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function EventMarkers({ events, geofences }: { events: GeofenceEventInfo[]; geofences: Geofence[] }) {
  return (
    <>
      {events.map((event, index) => {
        const geofence = geofences.find(g => g.id === event.geofence_id);
        if (!geofence || geofence.coordinates.length === 0) return null;

        const center = geofence.coordinates.reduce(
          (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng],
          [0, 0]
        ).map(v => v / geofence.coordinates.length) as [number, number];

        return (
          <CircleMarker
            key={`${event.geofence_id}-${event.event_type}-${index}`}
            center={center}
            radius={event.event_type === 'entry' ? 12 : 10}
            pathOptions={{
              fillColor: event.event_type === 'entry' ? '#22c55e' : '#ef4444',
              color: '#fff',
              weight: 2,
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="p-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300">
                  {event.event_type === 'entry' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {event.event_type.toUpperCase()}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{geofence.name}</p>
                <p className="text-xs text-gray-500">{event.category}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export function MapView({
  geofences,
  vehicles,
  selectedVehicle,
  currentLocation,
  recentEvents = [],
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onVehicleClick,
  onGeofenceClick,
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null);
  const [simulateLocation, setSimulateLocation] = useState<[number, number] | null>(null);

  const bounds = useMemo(() => {
    const allCoords: [number, number][] = [];
    geofences.forEach(g => g.coordinates.forEach(c => allCoords.push([c[0], c[1]])));
    vehicles.forEach(v => {
      const loc = v.id === selectedVehicle?.id ? currentLocation : null;
      if (loc && loc.latitude !== undefined && loc.longitude !== undefined) {
        allCoords.push([loc.latitude, loc.longitude]);
      }
    });
    if (simulateLocation) allCoords.push(simulateLocation);
    return allCoords.length > 0 ? allCoords : null;
  }, [geofences, vehicles, selectedVehicle, currentLocation, simulateLocation]);

  useEffect(() => {
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds]);

  const handleMapReady = () => {
    if (mapRef.current) {
      const mapCenter = mapRef.current.getCenter();
      setMapCenter([mapCenter.lat, mapCenter.lng]);
      setMapZoom(mapRef.current.getZoom());
    }
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        whenReady={handleMapReady}
        className="h-full w-full"
      >
        <MapClickHandler
          selectedVehicle={selectedVehicle || null}
          onMapClick={onMapClick}
          setSimulateLocation={setSimulateLocation}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeofenceLayer geofences={geofences} onClick={onGeofenceClick} selectedId={selectedGeofenceId} onSelect={setSelectedGeofenceId} selectedVehicle={selectedVehicle || undefined} />
        {vehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            location={vehicle.id === selectedVehicle?.id ? (currentLocation ?? null) : null}
            isSelected={vehicle.id === selectedVehicle?.id}
            onClick={() => onVehicleClick?.(vehicle)}
          />
        ))}
        {recentEvents.length > 0 && <EventMarkers events={recentEvents} geofences={geofences} />}
        {simulateLocation && (
          <Marker position={simulateLocation} icon={L.divIcon({
            className: 'flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-600 animate-pulse',
            html: '<span class="text-white text-xs">📍</span>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })} />
        )}
      </MapContainer>
      {selectedVehicle && onMapClick && (
        <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:bottom-4 lg:w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-lg pointer-events-none">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Click on map to simulate location for <strong>{selectedVehicle.vehicle_number}</strong>
          </p>
        </div>
      )}
    </div>
  );
}