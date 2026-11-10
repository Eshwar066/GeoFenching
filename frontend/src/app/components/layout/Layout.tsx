import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LiveAlertsPortal, useLiveAlerts } from '@/app/components/ui/LiveAlertsPortal';
import { cn } from '@/app/lib/utils/cn';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLiveAlerts, setShowLiveAlerts] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { alerts, acknowledge, dismiss } = useLiveAlerts();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const unackedCount = alerts.filter(a => !a.acknowledged).length;

  const handleNotificationsClick = () => {
    setShowLiveAlerts(!showLiveAlerts);
  };

  const handleCloseLiveAlerts = () => {
    setShowLiveAlerts(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div
        className={cn(
          'lg:pl-64 transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : 'translate-x-0'
        )}
      >
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isConnected={true}
          liveAlertsCount={unackedCount}
          onNotificationsClick={handleNotificationsClick}
          bellRef={bellRef}
        />
        <main className="p-4 lg:p-6" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Always render the portal so WebSocket connects, but it will only show when isOpen or there are unacked alerts */}
      <LiveAlertsPortal
        alerts={alerts}
        onAcknowledge={acknowledge}
        onDismiss={dismiss}
        isOpen={showLiveAlerts || unackedCount > 0}
        onClose={handleCloseLiveAlerts}
        triggerRef={bellRef}
      />
    </div>
  );
}