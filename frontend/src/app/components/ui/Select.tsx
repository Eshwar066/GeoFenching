import { forwardRef, useRef, useState, useEffect, useId } from 'react';
import { cn } from '@/app/lib/utils/cn';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, value, onChange, defaultValue, id, disabled, required, ...restProps }: SelectProps, ref) => {
    const selectId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const generatedId = id || label?.toLowerCase().replace(/\s+/g, '-') || selectId;

    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
            buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayValue = selectedOption?.label || placeholder || '';

    // Filter out props that don't belong on button element
    const { required: _required, ...buttonProps } = restProps as Record<string, unknown>;

    return (
      <div className={cn('w-full', className)} ref={ref}>
        {label && (
          <label htmlFor={generatedId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-labelledby={label ? generatedId : undefined}>
          <button
            ref={buttonRef}
            type="button"
            id={generatedId}
            disabled={disabled}
            aria-controls={`${generatedId}-listbox`}
            aria-activedescendant={isOpen && selectedValue ? `${generatedId}-option-${selectedValue}` : undefined}
            className={cn(
              'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800',
              'text-left text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
              'flex items-center justify-between gap-2',
              error ? 'border-danger-500 focus:ring-danger-500' : 'border-gray-300 dark:border-gray-600',
              'transition-colors duration-150'
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            {...buttonProps}
          >
            <span className={cn('truncate flex-1', !selectedValue && 'text-gray-400 dark:text-gray-500')}>
              {displayValue}
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-150',
              isOpen && 'rotate-180'
            )} aria-hidden="true" />
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              id={`${generatedId}-listbox`}
              role="listbox"
              aria-label={label}
              className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1"
            >
              {options.map((option) => (
                <div
                  key={option.value}
                  id={`${generatedId}-option-${option.value}`}
                  role="option"
                  aria-selected={selectedValue === option.value}
                  className={cn(
                    'px-3 py-2 cursor-pointer text-sm',
                    selectedValue === option.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <div className="flex items-center gap-2">
                    {selectedValue === option.value && <Check className="h-4 w-4 text-primary-600" />}
                    <span>{option.label}</span>
                  </div>
                </div>
              ))}
              {options.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No options available
                </div>
              )}
            </div>
          )}
        </div>
        {error && (
          <p id={`${generatedId}-error`} className="mt-1 text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${generatedId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
        {/* Hidden native select for form submission */}
        <select
          id={`${generatedId}-native`}
          value={selectedValue}
          onChange={(e) => handleSelect(e.target.value)}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';