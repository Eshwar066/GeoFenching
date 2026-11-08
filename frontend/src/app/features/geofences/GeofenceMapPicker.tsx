import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import { MapPin, Undo2, Trash2, X, Plus } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 14;

interface GeofenceMapPickerProps {
  coordinates: [number, number][];
  onChange: (coords: [number, number][]) => void;
  readOnly?: boolean;
}

function MapClickHandler({ onClick, readOnly }: { onClick: (e: LeafletMouseEvent) => void; readOnly: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (readOnly) return;

    const handleClick = (e: LeafletMouseEvent) => {
      console.log('Leaflet map event fired:', e.latlng);
      onClick(e);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick, readOnly]);

  return null;
}

const geofenceMarkerIcon = (index: number, isSelected: boolean) => L.divIcon({
  className: 'custom-geofence-marker',
  html: `
    <div class="geofence-marker ${isSelected ? 'selected' : ''}">
      ${index + 1}
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

export function GeofenceMapPicker({ coordinates, onChange, readOnly = false }: GeofenceMapPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    if (readOnly) return;
    const { lat, lng } = e.latlng;
    console.log('Map clicked:', lat, lng);
    onChange([...coordinates, [lat, lng]]);
  }, [readOnly, coordinates, onChange]);

  const handleRemovePoint = useCallback((index: number) => {
    if (readOnly) return;
    const newCoords = coordinates.filter((_, i) => i !== index);
    onChange(newCoords);
    if (selectedIndex === index) setSelectedIndex(null);
    else if (selectedIndex !== null && selectedIndex > index) setSelectedIndex(selectedIndex - 1);
  }, [readOnly, coordinates, onChange, selectedIndex]);

  const handlePointClick = useCallback((index: number) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  }, [selectedIndex]);

  const handleUndo = useCallback(() => {
    if (readOnly || coordinates.length === 0) return;
    onChange(coordinates.slice(0, -1));
  }, [readOnly, coordinates, onChange]);

  const handleClear = useCallback(() => {
    if (readOnly) return;
    onChange([]);
    setSelectedIndex(null);
  }, [readOnly, onChange]);

  const isClosed = coordinates.length >= 4 &&
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1];

  const displayCoords = isClosed ? coordinates.slice(0, -1) : coordinates;

  return (
    <div className="relative">
      <style>{`
        .custom-geofence-marker {
          background: transparent;
          border: none;
        }
        .geofence-marker {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          color: #2563eb;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.15s ease;
        }
        .geofence-marker.selected {
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px #3b82f6, 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: scale(1.2);
          z-index: 1000;
        }
        .geofence-marker:hover:not(.selected) {
          border-color: #1d4ed8;
          background: #eff6ff;
        }
      `}</style>

      <div className="relative h-96 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
        <MapContainer
          center={coordinates.length > 0 ? coordinates[0] : DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={!readOnly}
          className="h-full w-full"
          style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} readOnly={readOnly} />

          {coordinates.length > 0 && (
            <Polygon
              positions={coordinates as LatLngExpression[]}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: isClosed ? undefined : '5, 5',
              }}
              interactive={false}
            />
          )}

          {coordinates.map((coord, index) => (
            <Marker
              key={index}
              position={coord as LatLngExpression}
              interactive={!readOnly}
              icon={geofenceMarkerIcon(index, selectedIndex === index)}
              eventHandlers={{
                click: (e: LeafletMouseEvent) => {
                  e.originalEvent?.stopPropagation();
                  handlePointClick(index);
                },
              }}
            />
          ))}
        </MapContainer>

        {!readOnly && coordinates.length > 0 && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={handleUndo}
              disabled={coordinates.length === 0}
              className={cn(
                'p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200',
                'hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-1.5 text-sm font-medium'
              )}
              title="Remove last point"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              onClick={handleClear}
              className={cn(
                'p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200',
                'hover:bg-gray-100 text-gray-700 flex items-center gap-1.5 text-sm font-medium'
              )}
              title="Clear all points"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        )}

        {!readOnly && coordinates.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm pointer-events-none">
            <div className="text-center p-6 pointer-events-auto">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Click on the map to add points</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Minimum 4 points to create a polygon</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Points ({displayCoords.length} / {isClosed ? displayCoords.length + 1 : displayCoords.length + (coordinates.length > 0 ? 1 : 0)})
          </h3>
          {isClosed && (
            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300 rounded-full">
              Polygon closed
            </span>
          )}
        </div>

        {displayCoords.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
            {displayCoords.map((coord, index) => (
              <div
                key={index}
                onClick={() => handlePointClick(index)}
                className={cn(
                  'flex items-center justify-between p-2 rounded cursor-pointer transition-colors',
                  selectedIndex === index ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                    selectedIndex === index ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-300 text-gray-600'
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {coord[0].toFixed(6)}, {coord[1].toFixed(6)}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemovePoint(index); }}
                    className="p-1 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                    aria-label="Remove point"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && coordinates.length > 0 && !isClosed && coordinates.length >= 3 && (
          <button
            onClick={() => onChange([...coordinates, coordinates[0]])}
            className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Close Polygon (add first point)
          </button>
        )}
      </div>
    </div>
  );
}

export function GeofenceMapPickerWrapper({ coordinates, onChange, readOnly = false }: GeofenceMapPickerProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Draw Geofence on Map
      </label>
      <GeofenceMapPicker coordinates={coordinates} onChange={onChange} readOnly={readOnly} />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {readOnly
          ? 'View only mode'
          : 'Click map to add points. Minimum 4 points required. Click first point again to close polygon.'
        }
      </p>
    </div>
  );
}