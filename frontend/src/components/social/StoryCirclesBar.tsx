import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StoryItem {
  id: string;
  label: string;
  image: string;
  city?: string;
  isAdd?: boolean;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: 'lagos-2000s',
    label: 'Lagos 2000s',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=150&q=80',
    city: 'Lagos',
  },
  {
    id: 'abuja-90s',
    label: 'Abuja 90s',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&q=80',
    city: 'Abuja',
  },
  {
    id: 'kano-80s',
    label: 'Kano 80s',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=150&q=80',
    city: 'Kano',
  },
  {
    id: 'port-harcourt',
    label: 'Port Harcourt',
    image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=150&q=80',
    city: 'Port Harcourt',
  },
  {
    id: 'ibadan-heritage',
    label: 'Ibadan 70s',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=150&q=80',
    city: 'Ibadan',
  },
  {
    id: 'enugu-coal-city',
    label: 'Enugu City',
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=150&q=80',
    city: 'Enugu',
  },
  {
    id: 'calabar-history',
    label: 'Calabar Fest',
    image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=150&q=80',
    city: 'Calabar',
  },
];

interface StoryCirclesBarProps {
  className?: string;
}

export const StoryCirclesBar: React.FC<StoryCirclesBarProps> = ({ className = '' }) => {
  const { user, profile } = useAuth();

  return (
    <div
      className={`w-full bg-white border-b border-gray-100 py-3.5 px-4 overflow-x-auto scrollbar-none shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-max">
        {/* User's "Add Memory/Story" Circle */}
        <Link
          to="/add-memory"
          className="flex flex-col items-center gap-1.5 group shrink-0 focus:outline-none"
        >
          <div className="relative w-15 h-15 rounded-full p-0.5 border-2 border-dashed border-[#16A34A] flex items-center justify-center bg-gray-50 group-hover:bg-emerald-50/50 transition-colors">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Your Story'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-[#16A34A] font-bold text-sm">
                {profile?.full_name ? profile.full_name.charAt(0) : 'N'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-[#16A34A] text-white flex items-center justify-center border-2 border-white shadow-xs">
              <Plus className="w-3 h-3 stroke-[3px]" />
            </span>
          </div>
          <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[62px] text-center">
            {user ? 'Your pin' : 'Add pin'}
          </span>
        </Link>

        {/* Featured Era/City Story Circles */}
        {DEFAULT_STORIES.map((story) => (
          <Link
            key={story.id}
            to={`/explore?city=${encodeURIComponent(story.city || '')}`}
            className="flex flex-col items-center gap-1.5 group shrink-0 focus:outline-none"
          >
            <div className="w-15 h-15 rounded-full p-0.5 ring-2 ring-[#16A34A] ring-offset-2 ring-offset-white transition-transform group-hover:scale-105 active:scale-95">
              <img
                src={story.image}
                alt={story.label}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="text-[11px] font-medium text-gray-700 group-hover:text-[#16A34A] truncate max-w-[66px] text-center transition-colors">
              {story.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
