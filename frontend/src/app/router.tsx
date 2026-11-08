import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/app/components/layout/Layout';
import { Dashboard } from '@/app/features/dashboard/Dashboard';
import { LiveMap } from '@/app/features/locations/LiveMap';
import { Geofences } from '@/app/features/geofences/Geofences';
import { Vehicles } from '@/app/features/vehicles/Vehicles';
import { Alerts } from '@/app/features/alerts/Alerts';
import { Violations } from '@/app/features/violations/Violations';
import { Settings } from '@/app/features/settings/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'map', element: <LiveMap /> },
      { path: 'geofences', element: <Geofences /> },
      { path: 'vehicles', element: <Vehicles /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'history', element: <Violations /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);