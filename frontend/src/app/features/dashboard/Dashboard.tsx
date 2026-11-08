import { useQuery } from '@tanstack/react-query';
import { Truck, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/app/lib/api/client';
import { useLiveAlerts } from '@/app/components/ui/LiveAlertsPortal';

export function Dashboard() {
  const { data: geofencesData } = useQuery({
    queryKey: ['geofences', { limit: 100 }],
    queryFn: () => api.getGeofences({ limit: 100 }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => api.getVehicles({ limit: 100 }),
  });

  const { data: violationsData } = useQuery({
    queryKey: ['violations', { limit: 100 }],
    queryFn: () => api.getViolations({ limit: 100 }),
  });

  const { alerts: liveAlerts } = useLiveAlerts();

  const activeVehicles = vehiclesData?.data.filter(v => v.status === 'active').length || 0;
  const totalGeofences = geofencesData?.total || 0;
  const unackedAlerts = liveAlerts.filter(a => !a.acknowledged).length;
  const recentEvents = violationsData?.total || 0;

  const stats = [
    { value: activeVehicles, label: 'Active Vehicles', icon: Truck, color: 'primary' },
    { value: totalGeofences, label: 'Geofences', icon: MapPin, color: 'primary' },
    { value: unackedAlerts, label: 'Unacknowledged Alerts', icon: AlertTriangle, color: 'primary' },
    { value: recentEvents, label: 'Events (24h)', icon: Clock, color: 'primary' },
  ];

  const recentViolations = violationsData?.data.slice(0, 5) || [];
  const recentGeofences = geofencesData?.data.slice(0, 5) || [];
  const recentVehicles = vehiclesData?.data.slice(0, 5) || [];

  const cardColors = {
    primary: { card: 'bg-primary-50 border-primary-200 dark:bg-primary-900/30 dark:border-primary-700', icon: 'bg-primary-100 dark:bg-primary-800/40', text: 'text-primary-800 dark:text-primary-200', iconText: 'text-primary-700 dark:text-primary-300' },
    success: { card: 'bg-green-50 border-green-300 dark:bg-green-900/40 dark:border-green-600', icon: 'bg-green-100 dark:bg-green-800/50', text: 'text-green-900 dark:text-green-100', iconText: 'text-green-800 dark:text-green-200' },
    warning: { card: 'bg-amber-50 border-amber-300 dark:bg-amber-900/40 dark:border-amber-600', icon: 'bg-amber-100 dark:bg-amber-800/50', text: 'text-amber-900 dark:text-amber-100', iconText: 'text-amber-800 dark:text-amber-200' },
    danger: { card: 'bg-red-50 border-red-300 dark:bg-red-900/40 dark:border-red-600', icon: 'bg-red-100 dark:bg-red-800/50', text: 'text-red-900 dark:text-red-100', iconText: 'text-red-800 dark:text-red-200' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time geofencing overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const c = cardColors[stat.color as keyof typeof cardColors];
          return (
            <div key={stat.label} className={cn('p-4 rounded-xl border', c.card, c.text)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-lg', c.icon, c.iconText)}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Events</h2>
            {recentViolations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentViolations.map((violation) => (
                  <div key={violation.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className={cn(
                      'p-2 rounded-full',
                      violation.event_type === 'entry' ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'
                    )}>
                      {violation.event_type === 'entry' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{violation.vehicle_number}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{violation.geofence_name} • {violation.event_type}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(violation.occurred_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Active Geofences</h2>
            {recentGeofences.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No geofences created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGeofences.map((gf) => (
                  <div key={gf.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <div className={cn('w-3 h-3 rounded-full', gf.category === 'restricted_zone' ? 'bg-danger-500' : gf.category === 'danger_zone' ? 'bg-warning-500' : gf.category === 'safe_zone' ? 'bg-success-500' : 'bg-primary-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{gf.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{gf.category.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Active Vehicles</h2>
            {recentVehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No vehicles registered</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVehicles.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <div className={cn('p-2 rounded-full', v.status === 'active' ? 'bg-primary-100' : 'bg-gray-100')}>
                      {v.vehicle_type === 'truck' ? '🚛' : v.vehicle_type === 'bus' ? '🚌' : v.vehicle_type === 'van' ? '🚐' : v.vehicle_type === 'motorcycle' ? '🏍️' : '🚗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{v.vehicle_number}</p>
                      <p className="text-xs text-gray-500">{v.driver_name}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 text-xs rounded-full', v.status === 'active' ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300' : 'bg-gray-100 text-gray-700')}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}