import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'category' | 'success' | 'warning' | 'error';
  categoryColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  categoryColor,
  size = 'md',
  children,
  style,
  ...props
}) => {
  const base = 'inline-flex items-center font-medium rounded-pill transition-colors';

  const variants = {
    default: 'bg-gray-100 text-charcoal-dark border border-border',
    primary: 'bg-primary-light text-primary-dark border border-primary-border',
    secondary: 'bg-emerald-50 text-emerald-800',
    outline: 'bg-white text-charcoal border border-border',
    category: 'text-white shadow-xs',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const customStyle = categoryColor ? { backgroundColor: categoryColor, ...style } : style;

  return (
    <span
      className={twMerge(clsx(base, variants[variant], sizes[size], className))}
      style={customStyle}
      {...props}
    >
      {children}
    </span>
  );
};
