import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Truck, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import { api } from '@/app/lib/api/client';
import { useCreateVehicle, useUpdateVehicleStatus } from '@/app/lib/api/hooks';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ToastProvider, useToast } from '@/app/components/ui/Toast';
import type { Vehicle, CreateVehicleRequest, VehicleType, VehicleStatus } from '@/app/lib/types';

const vehicleTypeOptions = [
  { value: 'car', label: 'Car' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'van', label: 'Van' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
];

function VehicleForm({ vehicle, onSubmit, onClose }: { vehicle?: Vehicle; onSubmit: (data: CreateVehicleRequest) => void; onClose: () => void }) {
  const [vehicle_number, setVehicleNumber] = useState(vehicle?.vehicle_number || '');
  const [driver_name, setDriverName] = useState(vehicle?.driver_name || '');
  const [vehicle_type, setVehicleType] = useState<VehicleType>(vehicle?.vehicle_type || 'truck');
  const [phone, setPhone] = useState(vehicle?.phone || '');
  const [errors, setErrors] = useState<Partial<Record<keyof CreateVehicleRequest, string>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof CreateVehicleRequest, string>> = {};
    if (!vehicle_number.trim()) newErrors.vehicle_number = 'Vehicle number is required';
    if (!driver_name.trim()) newErrors.driver_name = 'Driver name is required';
    if (!vehicle_type) newErrors.vehicle_type = 'Vehicle type is required';
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    else if (phone.length < 10) newErrors.phone = 'Phone must be at least 10 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ vehicle_number, driver_name, vehicle_type, phone });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Vehicle Number"
        value={vehicle_number}
        onChange={(e) => setVehicleNumber(e.target.value)}
        error={errors.vehicle_number}
        placeholder="e.g., KA-01-AB-1234"
        required
      />
      <Input
        label="Driver Name"
        value={driver_name}
        onChange={(e) => setDriverName(e.target.value)}
        error={errors.driver_name}
        placeholder="e.g., Rajesh Kumar"
        required
      />
      <Select
        label="Vehicle Type"
        value={vehicle_type}
        onChange={(v) => setVehicleType(v as VehicleType)}
        options={vehicleTypeOptions}
        required
      />
      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        placeholder="e.g., 9876543210"
        required
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{vehicle ? 'Update' : 'Register'}</Button>
      </div>
    </form>
  );
}

const vehicleIcons: Record<VehicleType, string> = {
  truck: '🚛',
  bus: '🚌',
  van: '🚐',
  motorcycle: '🏍️',
  car: '🚗',
};

export function Vehicles() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { success, error } = useToast();
  const createMutation = useCreateVehicle();
  const updateStatusMutation = useUpdateVehicleStatus();

  const { data: vehiclesData, isLoading, refetch } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => api.getVehicles({ limit: 100 }),
  });

  const vehicles = vehiclesData?.data || [];

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driver_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (data: CreateVehicleRequest) => {
    try {
      await createMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      success('Vehicle registered successfully');
    } catch (err) {
      error('Failed to register vehicle', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return;
    try {
      await api.deleteVehicle(id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      success('Vehicle deleted');
    } catch {
      error('Failed to delete vehicle');
    }
  };

  const handleStatusChange = async (id: string, status: VehicleStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, data: { status } });
      success(`Vehicle status updated to ${status}`);
    } catch (err) {
      error('Failed to update status', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vehicles</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage fleet vehicles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              Register Vehicle
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md sm:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: '', label: 'All Status' }, ...statusOptions]}
              placeholder="Filter by status"
              className="w-full sm:w-40"
            />
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{searchTerm || statusFilter ? 'No matching vehicles found' : 'No vehicles registered yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registered</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{vehicleIcons[v.vehicle_type]}</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{v.vehicle_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{v.driver_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300 rounded-full capitalize">
                          {v.vehicle_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{v.phone}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={v.status}
                          onChange={(status) => handleStatusChange(v.id, status as VehicleStatus)}
                          options={statusOptions}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
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
          onClose={() => { setIsModalOpen(false); setEditingVehicle(null); }}
          title={editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}
        >
          <VehicleForm vehicle={editingVehicle || undefined} onSubmit={handleCreate} onClose={() => { setIsModalOpen(false); setEditingVehicle(null); }} />
        </Modal>
      </div>
    </ToastProvider>
  );
}