import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import { api } from '@/app/lib/api/client';
import { format } from 'date-fns';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import type { ViolationFilters } from '@/app/lib/types';

const eventTypeOptions = [
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
];

const severityColors = {
  entry: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
  exit: 'bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300',
};

export function Violations() {
  const [filters, setFilters] = useState<ViolationFilters>({
    limit: 50,
    offset: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data: geofencesData } = useQuery({
    queryKey: ['geofences', { limit: 100 }],
    queryFn: () => api.getGeofences({ limit: 100 }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: () => api.getVehicles({ limit: 100 }),
  });

  const geofences = geofencesData?.data || [];
  const vehicles = vehiclesData?.data || [];

  const queryFilters = useMemo(() => ({
    ...filters,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  }), [filters, currentPage]);

  const { data: violationsData, isLoading } = useQuery({
    queryKey: ['violations', queryFilters],
    queryFn: () => api.getViolations(queryFilters),
  });

  const violations = violationsData?.data || [];
  const total = violationsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = (key: keyof ViolationFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['ID', 'Vehicle', 'Geofence', 'Event Type', 'Latitude', 'Longitude', 'Occurred At'];
    const rows = violations.map(v => [
      v.id,
      v.vehicle_number,
      v.geofence_name,
      v.event_type,
      v.latitude.toString(),
      v.longitude.toString(),
      new Date(v.occurred_at).toISOString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Violation History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and filter geofence entry/exit events</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <Select
              label="Vehicle"
              value={filters.vehicle_id || ''}
              onChange={(v) => handleFilterChange('vehicle_id', v || undefined)}
              options={[{ value: '', label: 'All Vehicles' }, ...vehicles.map(v => ({ value: v.id, label: `${v.vehicle_number} - ${v.driver_name}` }))]}
              placeholder="All vehicles"
              className="sm:col-span-2 lg:col-span-2 xl:col-span-1"
            />
            <Select
              label="Geofence"
              value={filters.geofence_id || ''}
              onChange={(v) => handleFilterChange('geofence_id', v || undefined)}
              options={[{ value: '', label: 'All Geofences' }, ...geofences.map(g => ({ value: g.id, label: g.name }))]}
              placeholder="All geofences"
              className="sm:col-span-2 lg:col-span-2 xl:col-span-1"
            />
            <Select
              label="Event Type"
              value={filters.event_type || ''}
              onChange={(v) => handleFilterChange('event_type', v || undefined)}
              options={[{ value: '', label: 'All Types' }, ...eventTypeOptions]}
              placeholder="All types"
              className="sm:col-span-1 lg:col-span-1 xl:col-span-1"
            />
            <Input
              label="Start Date"
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
              className="sm:col-span-1 lg:col-span-1 xl:col-span-1"
            />
            <Input
              label="End Date"
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
              className="sm:col-span-1 lg:col-span-1 xl:col-span-1"
            />
          </div>
        </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading violations...
          </div>
        ) : violations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No violations found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Geofence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {violations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{violation.vehicle_number}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {violation.vehicle_id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{violation.geofence_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {violation.geofence_id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          severityColors[violation.event_type as keyof typeof severityColors]
                        )}>
                          {violation.event_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {violation.latitude.toFixed(6)}, {violation.longitude.toFixed(6)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {format(new Date(violation.occurred_at), 'MMM d, yyyy HH:mm:ss')}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}