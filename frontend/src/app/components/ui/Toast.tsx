import { Fragment, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200',
  error: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200',
  warning: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200',
  info: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200',
};

function ToastItem({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[toast.type];

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(toast.id), 200);
      }, toast.duration ?? 5000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [toast, onClose]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-slide-in',
        colors[toast.type],
        isExiting && 'animate-fade-out'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              onClose(toast.id);
            }}
            className="text-sm font-medium underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainerInner({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return createPortal(
    <Fragment>
      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fade-out {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-fade-out {
          animation: fade-out 0.2s ease-in forwards;
        }
      `}</style>
      <ToastContainerInner toasts={toasts} onClose={onClose} />
    </Fragment>,
    document.body
  );
}

let toastId = 0;
const listeners: Set<() => void> = new Set();
let toasts: Toast[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function useToast() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${++toastId}-${Date.now()}`;
    toasts = [...toasts, { ...toast, id }];
    notify();
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'success', title, message, ...options }), [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'error', title, message, ...options }), [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'warning', title, message, ...options }), [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'info', title, message, ...options }), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <Fragment>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </Fragment>
  );
}