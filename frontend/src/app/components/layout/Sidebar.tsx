import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Bell,
  History,
  Settings,
  Map,
} from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Live Map', href: '/map', icon: Map },
  { name: 'Geofences', href: '/geofences', icon: MapPin },
  { name: 'Vehicles', href: '/vehicles', icon: Truck },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'History', href: '/history', icon: History },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 lg:translate-x-0">
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600">GeoFencing</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}