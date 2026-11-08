import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/app/lib/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          className={cn(
            'relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all',
            sizes[size],
            className
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}