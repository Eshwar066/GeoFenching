import { Menu, Bell, Wifi, WifiOff, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/app/lib/utils/cn';

interface HeaderProps {
  onMenuClick: () => void;
  isConnected: boolean;
  liveAlertsCount: number;
  onNotificationsClick?: () => void;
  bellRef?: React.RefObject<HTMLButtonElement>;
}

export function Header({ onMenuClick, isConnected, liveAlertsCount, onNotificationsClick, bellRef }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">
            GeoFencing Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              isConnected
                ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700'
                : 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/40 dark:text-danger-300 dark:border-danger-800'
            )}>
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={`Notifications ${liveAlertsCount > 0 ? `(${liveAlertsCount})` : ''}`}
              onClick={onNotificationsClick}
            >
              <Bell className="h-5 w-5" />
              {liveAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-medium pointer-events-none">
                  {liveAlertsCount > 9 ? '9+' : liveAlertsCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <User className="h-5 w-5" />
              <span className="hidden md:block">Operator</span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Fleet Operator</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">operator@company.com</p>
                  </div>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}