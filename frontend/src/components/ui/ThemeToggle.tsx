import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'labeled';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', variant = 'icon' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`inline-flex items-center justify-center rounded-lg p-2 text-charcoal-muted hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6B3A] ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-fade-in" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-charcoal-muted animate-fade-in" aria-hidden="true" />
      )}
      {variant === 'labeled' && (
        <span className="ml-2 text-xs font-medium">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
