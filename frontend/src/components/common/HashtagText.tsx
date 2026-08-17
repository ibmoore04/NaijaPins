import React from 'react';
import { Link } from 'react-router-dom';

interface HashtagTextProps {
  text: string;
  className?: string;
  target?: 'explore' | 'community';
}

/**
 * Parses and renders text with interactive clickable #hashtags
 */
export const HashtagText: React.FC<HashtagTextProps> = ({
  text,
  className = '',
  target = 'explore',
}) => {
  if (!text) return null;

  // Split by hashtags (e.g. #Lagos, #1960, #Heritage)
  const parts = text.split(/(#[a-zA-Z0-9_\u00C0-\u017F]+)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.substring(1);
          const destination =
            target === 'explore'
              ? `/explore?tag=${encodeURIComponent(tag)}`
              : `/community?tag=${encodeURIComponent(tag)}`;

          return (
            <Link
              key={index}
              to={destination}
              className="text-[#0B6B3A] font-semibold hover:underline cursor-pointer transition-colors inline-block"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return part;
      })}
    </span>
  );
};
