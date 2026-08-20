import React from 'react';
import { Link } from 'react-router-dom';
import logoSrc from '@/assets/branding/naijapins-logo.png';

export interface NaijaPinsLogoProps {
  variant?: 'full' | 'icon' | 'compact' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  to?: string;
  asLink?: boolean;
  onClick?: () => void;
}

const sizeConfig = {
  xs: { icon: 'w-5 h-5 rounded-lg', text: 'text-sm font-bold', sub: 'text-[9px]' },
  sm: { icon: 'w-7 h-7 rounded-xl', text: 'text-base font-bold', sub: 'text-[10px]' },
  md: { icon: 'w-8 h-8 sm:w-9 sm:h-9 rounded-2xl', text: 'text-lg sm:text-xl font-bold tracking-tight', sub: 'text-[11px]' },
  lg: { icon: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl', text: 'text-2xl font-black tracking-tight', sub: 'text-xs' },
  xl: { icon: 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl', text: 'text-3xl sm:text-4xl font-black tracking-tight', sub: 'text-sm' },
};

export const NaijaPinsLogo: React.FC<NaijaPinsLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  iconClassName = '',
  textClassName = '',
  to = '/',
  asLink = true,
  onClick,
}) => {
  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none transition-transform active:scale-98 ${className}`}>
      {/* Official NaijaPins Icon */}
      <img
        src={logoSrc}
        alt="NaijaPins"
        className={`object-cover shrink-0 shadow-xs border border-emerald-950/10 ${currentSize.icon} ${iconClassName}`}
      />

      {/* Wordmark */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span className={`font-heading text-[#0B6B3A] ${currentSize.text} ${textClassName}`}>
              Naija<span className="text-gray-900">Pins</span>
            </span>
            {variant === 'badge' && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-[#0B6B3A] uppercase tracking-wider">
                Beta
              </span>
            )}
          </div>
          {variant === 'full' && size !== 'xs' && size !== 'sm' && (
            <span className={`text-gray-400 font-medium tracking-wide mt-0.5 hidden sm:block ${currentSize.sub}`}>
              Where Nigeria remembers.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink && to) {
    return (
      <Link to={to} onClick={onClick} className="inline-flex items-center focus:outline-none group">
        {content}
      </Link>
    );
  }

  return <div onClick={onClick} className="inline-flex items-center">{content}</div>;
};
