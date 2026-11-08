import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, MapPin, Search } from 'lucide-react';
import { api } from '@/app/lib/api/client';
import { useCreateGeofence } from '@/app/lib/api/hooks';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ToastProvider, useToast } from '@/app/components/ui/Toast';
import { GeofenceMapPickerWrapper } from './GeofenceMapPicker';
import type { Geofence, CreateGeofenceRequest, GeofenceCategory } from '@/app/lib/types';

const categoryOptions = [
  { value: 'general', label: 'General' },
  { value: 'restricted_zone', label: 'Restricted Zone' },
  { value: 'danger_zone', label: 'Danger Zone' },
  { value: 'safe_zone', label: 'Safe Zone' },
  { value: 'custom', label: 'Custom' },
];

function GeofenceForm({ geofence, onSubmit, onClose }: { geofence?: Geofence; onSubmit: (data: CreateGeofenceRequest) => void; onClose: () => void }) {
  const [name, setName] = useState(geofence?.name || '');
  const [description, setDescription] = useState(geofence?.description || '');
  const [category, setCategory] = useState<GeofenceCategory>(geofence?.category || 'general');
  const [coordinates, setCoordinates] = useState<[number, number][]>(
    geofence?.coordinates as [number, number][] || []
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CreateGeofenceRequest, string>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof CreateGeofenceRequest, string>> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (coordinates.length < 4) newErrors.coordinates = 'At least 4 coordinate points required';
    else {
      const isClosed = coordinates.length >= 4 &&
        coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
        coordinates[0][1] === coordinates[coordinates.length - 1][1];
      if (!isClosed) newErrors.coordinates = 'Polygon must be closed (first and last point must match)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({ name, description, coordinates, category });
    onClose();
  };

  const handleCoordinatesChange = (newCoords: [number, number][]) => {
    setCoordinates(newCoords);
    if (errors.coordinates) setErrors(prev => ({ ...prev, coordinates: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g., Warehouse Zone"
        required
      />
      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Brief description of this zone"
      />
      <Select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value as GeofenceCategory)}
        options={categoryOptions}
        required
      />
      <GeofenceMapPickerWrapper
        coordinates={coordinates}
        onChange={handleCoordinatesChange}
        readOnly={false}
      />
      {errors.coordinates && (
        <p className="text-sm text-danger-500" role="alert">{errors.coordinates}</p>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{geofence ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}

export function Geofences() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const { success, error } = useToast();
  const createMutation = useCreateGeofence();

  const { data: geofencesData, isLoading } = useQuery({
    queryKey: ['geofences', { limit: 100 }],
    queryFn: () => api.getGeofences({ limit: 100 }),
  });

  const geofences = geofencesData?.data || [];

  const filteredGeofences = geofences.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = async (data: CreateGeofenceRequest) => {
    try {
      await createMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      success('Geofence created successfully');
    } catch (err) {
      error('Failed to create geofence', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleEdit = (gf: Geofence) => {
    setEditingGeofence(gf);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this geofence? This cannot be undone.')) return;
    try {
      await api.deleteGeofence(id);
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      success('Geofence deleted');
    } catch {
      error('Failed to delete geofence');
    }
  };

  const handleSubmit = (data: CreateGeofenceRequest) => {
    if (editingGeofence) {
      handleCreate(data);
    } else {
      handleCreate(data);
    }
  };

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Geofences</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage virtual boundaries</p>
          </div>
          <Button onClick={() => { setEditingGeofence(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Geofence
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search geofences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              placeholder="Filter by category"
              className="w-full sm:w-48"
            />
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredGeofences.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{searchTerm || categoryFilter ? 'No matching geofences found' : 'No geofences created yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coordinates</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredGeofences.map((gf) => (
                    <tr key={gf.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{gf.name}</p>
                        {gf.description && <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{gf.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300 rounded-full">
                          {gf.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {gf.coordinates.length} points
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(gf.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(gf)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(gf.id)}
                            className="p-1.5 text-gray-500 hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingGeofence(null); }}
          title={editingGeofence ? 'Edit Geofence' : 'Create Geofence'}
          size="lg"
        >
          <GeofenceForm geofence={editingGeofence || undefined} onSubmit={handleSubmit} onClose={() => { setIsModalOpen(false); setEditingGeofence(null); }} />
        </Modal>
      </div>
    </ToastProvider>
  );
}