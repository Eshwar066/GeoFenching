import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Bell, AlertTriangle, CheckCircle, X, Search } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import { api } from '@/app/lib/api/client';
import { useCreateAlertRule } from '@/app/lib/api/hooks';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ToastProvider, useToast } from '@/app/components/ui/Toast';
import { useLiveAlerts } from '@/app/components/ui/LiveAlertsPortal';
import type { CreateAlertRuleRequest, Geofence, Vehicle } from '@/app/lib/types';

const eventTypeOptions = [
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
  { value: 'both', label: 'Both Entry & Exit' },
];

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function AlertRuleForm({
  geofences,
  vehicles,
  onSubmit,
  onClose,
}: {
  geofences: Geofence[];
  vehicles: Vehicle[];
  onSubmit: (data: CreateAlertRuleRequest) => void;
  onClose: () => void;
}) {
  const [geofence_id, setGeofenceId] = useState('');
  const [vehicle_id, setVehicleId] = useState('');
  const [event_type, setEventType] = useState<'entry' | 'exit' | 'both'>('entry');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [notify_via_websocket, setNotifyViaWebsocket] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAlertRuleRequest, string>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof CreateAlertRuleRequest, string>> = {};
    if (!geofence_id) newErrors.geofence_id = 'Geofence is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ geofence_id, vehicle_id: vehicle_id || undefined, event_type, severity, notify_via_websocket });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Geofence"
        value={geofence_id}
        onChange={setGeofenceId}
        options={[{ value: '', label: 'Select geofence' }, ...geofences.map(g => ({ value: g.id, label: g.name }))]}
        error={errors.geofence_id}
        required
      />
      <Select
        label="Vehicle (optional - leave empty for all vehicles)"
        value={vehicle_id}
        onChange={setVehicleId}
        options={[{ value: '', label: 'All Vehicles' }, ...vehicles.map(v => ({ value: v.id, label: `${v.vehicle_number} - ${v.driver_name}` }))]}
        placeholder="All vehicles"
      />
      <Select
        label="Event Type"
        value={event_type}
        onChange={(v) => setEventType(v as 'entry' | 'exit' | 'both')}
        options={eventTypeOptions}
        required
      />
      <Select
        label="Severity"
        value={severity}
        onChange={(v) => setSeverity(v as 'low' | 'medium' | 'high' | 'critical')}
        options={severityOptions}
        required
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="notify_ws"
          checked={notify_via_websocket}
          onChange={(e) => setNotifyViaWebsocket(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="notify_ws" className="text-sm text-gray-700 dark:text-gray-300">
          Send real-time WebSocket notifications
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Create Alert Rule</Button>
      </div>
    </form>
  );
}

const severityColors = {
  low: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  medium: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  high: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  critical: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300 border border-primary-300',
};

const eventTypeColors = {
  entry: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  exit: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  both: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
};

export function Alerts() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { success, error } = useToast();
  const { alerts: liveAlerts, acknowledge, clearAll } = useLiveAlerts();
  const createMutation = useCreateAlertRule();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlertRules,
  });

  const { data: geofencesData } = useQuery({
    queryKey: ['geofences', { limit: 100 }],
    queryFn: () => api.getGeofences({ limit: 100 }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => api.getVehicles({ limit: 100 }),
  });

  const alerts = alertsData?.data || [];
  const geofences = geofencesData?.data || [];
  const vehicles = vehiclesData?.data || [];

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = a.geofence_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.vehicle_id && a.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const handleCreate = async (data: CreateAlertRuleRequest) => {
    try {
      await createMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      success('Alert rule created successfully');
    } catch (err) {
      error('Failed to create alert rule', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      await api.deleteAlertRule(id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      success('Alert rule deleted');
    } catch {
      error('Failed to delete alert rule');
    }
  };

  const unackedCount = liveAlerts.filter(a => !a.acknowledged).length;

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alert Rules & Live Feed</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Configure alerts and monitor real-time notifications</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Alert Rule
          </Button>
        </div>

        {unackedCount > 0 && (
          <div className="bg-warning-50 border border-warning-200 dark:bg-warning-900/20 dark:border-warning-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
                <div>
                  <p className="font-medium text-warning-800 dark:text-warning-300">{unackedCount} unacknowledged alert{unackedCount !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-warning-700 dark:text-warning-400">Live WebSocket notifications appear in the top-right panel</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAll}>Dismiss All</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md sm:max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search alert rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{searchTerm ? 'No matching alert rules' : 'No alert rules configured'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Geofence</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">WebSocket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAlerts.map((alert) => (
                        <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{geofences.find(g => g.id === alert.geofence_id)?.name || 'Unknown'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {alert.vehicle_id ? (
                              <p className="text-sm text-gray-900 dark:text-gray-100">{vehicles.find(v => v.id === alert.vehicle_id)?.vehicle_number || 'Unknown'}</p>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">All Vehicles</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', eventTypeColors[alert.event_type as keyof typeof eventTypeColors])}>
                              {alert.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', severityColors[alert.severity as keyof typeof severityColors])}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {alert.notify_via_websocket ? (
                              <span className="text-success-600 dark:text-success-400">✓ Enabled</span>
                            ) : (
                              <span className="text-gray-500">Disabled</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', alert.status === 'active' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700')}>
                              {alert.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(alert.id)}
                              className="p-1.5 text-gray-500 hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                              aria-label="Delete"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary-600" />
                Live Alerts Feed
              </h3>
              {liveAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No live alerts</p>
                  <p className="text-sm">WebSocket alerts will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {liveAlerts.slice(0, 10).map(alert => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800"
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded bg-primary-100 dark:bg-primary-800/50">
                          {(() => {
                            const isEntry = alert.eventType === 'entry';
                            const isDangerZone = alert.category === 'restricted_zone' || alert.category === 'danger_zone';
                            return isEntry && isDangerZone ? <AlertTriangle className="h-4 w-4 text-primary-600" /> : (isEntry ? <CheckCircle className="h-4 w-4 text-primary-600" /> : <AlertTriangle className="h-4 w-4 text-primary-600" />);
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{alert.vehicleNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{alert.geofenceName} • {alert.eventType}</p>
                        </div>
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300">
                          {alert.severity}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledge(alert.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Alert Rule"
          size="lg"
        >
          <AlertRuleForm
            geofences={geofences}
            vehicles={vehicles}
            onSubmit={handleCreate}
            onClose={() => setIsModalOpen(false)}
          />
        </Modal>
      </div>
    </ToastProvider>
  );
}