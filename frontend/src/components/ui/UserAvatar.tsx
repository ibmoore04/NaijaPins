import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Compute Initials
  const getInitials = (fullName?: string | null) => {
    if (!fullName || !fullName.trim()) return 'U';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  // Size mapping
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  if (src && !imgError) {
    return (
      <div className={`relative rounded-full overflow-hidden shrink-0 border border-border shadow-xs ${sizeClasses[size]} ${className}`}>
        <img
          src={src}
          alt={name || 'User avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-[#0B6B3A] text-white font-extrabold flex items-center justify-center shrink-0 border border-white/20 shadow-xs ${sizeClasses[size]} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};
