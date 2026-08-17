import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-charcoal-muted flex items-center pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full bg-white border rounded-md px-3.5 py-2.5 text-sm text-charcoal-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-150',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error
                  ? 'border-status-error focus:ring-status-error/30'
                  : 'border-border focus:border-primary focus:ring-primary/20',
                disabled && 'bg-gray-100 opacity-60 cursor-not-allowed',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-charcoal-muted flex items-center">{rightIcon}</span>
          )}
        </div>
        {error ? (
          <p className="text-xs text-status-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-charcoal-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
