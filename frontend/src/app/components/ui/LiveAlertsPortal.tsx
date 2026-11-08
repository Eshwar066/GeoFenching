import { Fragment, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, MapPin, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';
import type { WebSocketAlert } from '@/app/lib/types';

interface LiveAlert {
  id: string;
  vehicleNumber: string;
  geofenceName: string;
  eventType: 'entry' | 'exit';
  category: string;
  severity: string;
  timestamp: string;
  acknowledged: boolean;
}

interface LiveAlertsPortalProps {
  alerts: LiveAlert[];
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  maxVisible?: number;
  isOpen?: boolean;
  onClose?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

const severityColors = {
  critical: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700',
  high: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700',
  medium: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700',
  low: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700',
};

const severityIcons = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Info,
};

function LiveAlertItem({
  alert,
  onAcknowledge,
  onDismiss,
}: {
  alert: LiveAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = severityIcons[alert.severity as keyof typeof severityIcons] || AlertTriangle;
  const isEntry = alert.eventType === 'entry';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border shadow-sm animate-slide-down',
        severityColors[alert.severity as keyof typeof severityColors] || severityColors.low,
        alert.acknowledged && 'opacity-60'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{alert.vehicleNumber}</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300">
            {isEntry ? 'ENTERED' : 'EXITED'}
          </span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-800/50 dark:text-primary-300">
            {alert.category}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="inline h-3 w-3 mr-1" /> {alert.geofenceName}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
          >
            Acknowledge
          </button>
        )}
        <button
          onClick={() => onDismiss(alert.id)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LiveAlertsPanelInner({
  alerts,
  onAcknowledge,
  onDismiss,
  maxVisible = 5,
  isOpen = false,
  onClose,
  position = { top: 0, right: 0 },
}: LiveAlertsPortalProps & { isOpen?: boolean; onClose?: () => void; position?: { top: number; right: number } }) {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen && alerts.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[100] w-96 max-h-[calc(100vh-2rem)] flex flex-col animate-slide-down"
      style={{ top: position.top, right: position.right }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-t-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Live Alerts</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full dark:bg-primary-800/50 dark:text-primary-300">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={() => alerts.forEach(a => onDismiss(a.id))}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Dismiss all
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-700 p-3 space-y-2">
        {visibleAlerts.length > 0 ? (
          <>
            {visibleAlerts.map((alert) => (
              <LiveAlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={onAcknowledge}
                onDismiss={onDismiss}
              />
            ))}
            {hiddenCount > 0 && (
              <div className="text-center text-sm text-gray-500 py-2 border-t border-gray-200 dark:border-gray-700">
                +{hiddenCount} more alerts
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No live alerts</p>
            <p className="text-sm mt-1">WebSocket alerts will appear here in real-time</p>
          </div>
        )}
      </div>
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-b-xl border border-gray-200 dark:border-gray-700 border-t-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Alerts appear here in real-time via WebSocket
        </p>
      </div>
    </div>
  );
}

export function LiveAlertsPortal({
  alerts,
  onAcknowledge,
  onDismiss,
  maxVisible = 5,
  isOpen = false,
  onClose,
  triggerRef,
}: LiveAlertsPortalProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (triggerRef?.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [triggerRef, isOpen]);

  useEffect(() => {
    function handleResize() {
      if (triggerRef?.current && isOpen) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [triggerRef, isOpen]);

  return createPortal(
    <Fragment>
      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}</style>
      <LiveAlertsPanelInner
        alerts={alerts}
        onAcknowledge={onAcknowledge}
        onDismiss={onDismiss}
        maxVisible={maxVisible}
        isOpen={isOpen}
        onClose={onClose}
        position={position}
      />
    </Fragment>,
    document.body
  );
}

export function useLiveAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  const addAlert = (payload: WebSocketAlert['payload']) => {
    const newAlert: LiveAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vehicleNumber: payload.vehicle_number,
      geofenceName: payload.geofence_name,
      eventType: payload.event_type,
      category: payload.category,
      severity: payload.severity,
      timestamp: payload.timestamp,
      acknowledged: false,
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
  };

  const acknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAll = () => setAlerts([]);

  return {
    alerts,
    addAlert,
    acknowledge,
    dismiss,
    clearAll,
  };
}