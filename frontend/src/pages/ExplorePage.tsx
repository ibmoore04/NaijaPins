import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Category, MapBounds, MapPin, SocialMapFilter } from '@/types/database';
import { useMapPins } from '@/hooks/useMapPins';
import { useAuth } from '@/hooks/useAuth';
import { MapView } from '@/components/map/MapView';
import { TimelineFilterBar } from '@/components/map/TimelineFilterBar';
import { MapSocialControls } from '@/components/map/MapSocialControls';
import { PinPreviewDrawer } from '@/components/map/PinPreviewDrawer';
import { AuthModal } from '@/components/auth/AuthModal';
import { DEFAULT_CATEGORIES } from '@/pages/AddMemoryWizard';
import { Loader2, MapPin as MapPinIcon, Compass } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [startYear, setStartYear] = useState<number>(1960);
  const [endYear, setEndYear] = useState<number>(2030);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  // Near Me & Geolocation State
  const [isLocatingNearMe, setIsLocatingNearMe] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Auth modal trigger for unauthenticated social tab clicks
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Derive active filters from URL query parameters
  const userParam = searchParams.get('user');
  const userNameParam = searchParams.get('userName');
  const filterParam = searchParams.get('filter') as SocialMapFilter | null;
  const tagParam = searchParams.get('tag');
  const searchParam = searchParams.get('search');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const activeSocialFilter: SocialMapFilter = useMemo(() => {
    if (filterParam && ['all', 'my_memories', 'following', 'followers', 'social', 'recent', 'popular', 'near_me'].includes(filterParam)) {
      return filterParam;
    }
    return 'all';
  }, [filterParam]);

  const targetUser = useMemo(() => {
    if (!userParam) return null;
    return { id: userParam, name: userNameParam };
  }, [userParam, userNameParam]);

  // Fetch categories for filter bar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (data && data.length > 0) {
          setCategories(data as Category[]);
        }
      } catch {
        // Fallback to DEFAULT_CATEGORIES
      }
    };
    loadCategories();
  }, []);

  // Fetch target user's name if not in URL
  useEffect(() => {
    const loadTargetUserName = async () => {
      if (userParam && !userNameParam) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', userParam)
          .maybeSingle();
        if (data?.full_name) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('userName', data.full_name);
            return next;
          });
        }
      }
    };
    loadTargetUserName();
  }, [userParam, userNameParam, setSearchParams]);

  // Initialize near-me coords from URL params if present
  useEffect(() => {
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setNearMeCoords({ lat, lng });
      }
    }
  }, [latParam, lngParam]);

  // Handle Geolocation "Near Me"
  const handleTriggerNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingNearMe(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNearMeCoords({ lat: latitude, lng: longitude });
        setIsLocatingNearMe(false);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('filter', 'near_me');
          next.set('lat', latitude.toFixed(4));
          next.set('lng', longitude.toFixed(4));
          next.delete('user');
          next.delete('userName');
          return next;
        });
      },
      (error) => {
        setIsLocatingNearMe(false);
        console.warn('Geolocation access denied or unavailable:', error);
        setGeoError('Location access was denied or unavailable. You can still explore the map manually.');
        setTimeout(() => setGeoError(null), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [setSearchParams]);

  const handleClearNearMe = useCallback(() => {
    setNearMeCoords(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      next.delete('lat');
      next.delete('lng');
      return next;
    });
  }, [setSearchParams]);

  const handleClearTargetUser = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('user');
      next.delete('userName');
      return next;
    });
  }, [setSearchParams]);

  const handleClearHashtag = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('tag');
      return next;
    });
  }, [setSearchParams]);

  const handleSocialFilterChange = useCallback((filter: SocialMapFilter) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filter === 'all') {
        next.delete('filter');
      } else {
        next.set('filter', filter);
      }
      next.delete('user');
      next.delete('userName');
      return next;
    });
  }, [setSearchParams]);

  const handleViewAllPins = useCallback((userId: string, userName?: string) => {
    setSelectedPin(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('user', userId);
      if (userName) next.set('userName', userName);
      next.delete('filter');
      return next;
    });
  }, [setSearchParams]);

  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    setBounds((prev) => {
      if (
        prev &&
        Math.abs(prev.min_lat - newBounds.min_lat) < 0.0001 &&
        Math.abs(prev.max_lat - newBounds.max_lat) < 0.0001 &&
        Math.abs(prev.min_lng - newBounds.min_lng) < 0.0001 &&
        Math.abs(prev.max_lng - newBounds.max_lng) < 0.0001
      ) {
        return prev;
      }
      return newBounds;
    });
  }, []);

  const handleSelectPin = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
  }, []);

  const handleClosePin = useCallback(() => {
    setSelectedPin(null);
  }, []);

  const handleYearChange = useCallback((start: number, end: number) => {
    setStartYear(start);
    setEndYear(end);
  }, []);

  const handleCategoryChange = useCallback((catId: string | null) => {
    setSelectedCategory(catId);
  }, []);

  // Fetch map pins using TanStack Query RPC hook
  const { data: pins = [], isLoading, isError } = useMapPins({
    bounds,
    startYear,
    endYear,
    categoryId: selectedCategory,
    currentUserId: user?.id || null,
    socialFilter: activeSocialFilter,
    userIdFilter: targetUser?.id || null,
    searchQuery: searchParam || null,
    hashtag: tagParam || null,
    centerLat: activeSocialFilter === 'near_me' ? nearMeCoords?.lat : null,
    centerLng: activeSocialFilter === 'near_me' ? nearMeCoords?.lng : null,
    radiusKm: activeSocialFilter === 'near_me' ? 15 : null,
  });

  // Calculate default map center
  const mapCenter: [number, number] = useMemo(() => {
    if (activeSocialFilter === 'near_me' && nearMeCoords) {
      return [nearMeCoords.lat, nearMeCoords.lng];
    }
    return [6.5244, 3.3792]; // Lagos default
  }, [activeSocialFilter, nearMeCoords]);

  return (
    <div className="relative flex flex-col h-[calc(100vh-4.5rem)] w-full overflow-hidden isolate">
      {/* 1. Top Era & Category Filter Bar */}
      <TimelineFilterBar
        startYear={startYear}
        endYear={endYear}
        onYearChange={handleYearChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        categories={categories}
      />

      {/* 2. Main Map Canvas Container */}
      <div className="relative flex-1 w-full h-full">
        {/* Floating Social Filters & Banner (Top Center) */}
        <div className="absolute top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-30 flex flex-col items-center pointer-events-auto">
          <MapSocialControls
            activeSocialFilter={activeSocialFilter}
            onSocialFilterChange={handleSocialFilterChange}
            targetUser={targetUser}
            onClearTargetUser={handleClearTargetUser}
            activeHashtag={tagParam}
            onClearHashtag={handleClearHashtag}
            isLocatingNearMe={isLocatingNearMe}
            onTriggerNearMe={handleTriggerNearMe}
            onClearNearMe={handleClearNearMe}
            onOpenAuthPrompt={() => setAuthModalOpen(true)}
          />
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute top-18 right-4 z-30 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-md flex items-center gap-2 text-xs font-semibold text-[#0B6B3A] animate-fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Discovering memories...</span>
          </div>
        )}

        {/* Pin Count Badge */}
        {!isLoading && (
          <div className="absolute top-18 left-4 z-30 bg-black/80 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs">
            <MapPinIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>{pins.length} {pins.length === 1 ? 'Memory' : 'Memories'} Pinned</span>
          </div>
        )}

        {/* Geolocation / Error Toast */}
        {(geoError || isError) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/90 text-white border border-gray-700 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-medium max-w-sm text-center animate-fade-in">
            {geoError || 'Failed to load memories for this view.'}
          </div>
        )}

        {/* Empty State Banner (If 0 pins returned after loading) */}
        {!isLoading && pins.length === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md border border-border px-5 py-3 rounded-2xl shadow-xl text-center space-y-1 max-w-md animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-black">
              <Compass className="w-4 h-4 text-[#0B6B3A]" />
              <span>
                {targetUser
                  ? `No public memories found for ${targetUser.name || 'this contributor'}`
                  : activeSocialFilter === 'following'
                  ? 'People you follow haven’t pinned memories in this view'
                  : activeSocialFilter === 'followers'
                  ? 'Your followers haven’t pinned memories in this view'
                  : activeSocialFilter === 'my_memories'
                  ? 'You have no memories pinned in this view'
                  : activeSocialFilter === 'near_me'
                  ? 'No memories found within 15km of your location'
                  : tagParam
                  ? `No memories found with #${tagParam}`
                  : 'No heritage stories found in this map view'}
              </span>
            </div>
            <p className="text-[11px] text-charcoal-muted">
              Try panning the map, expanding the era range, or switching filter categories.
            </p>
          </div>
        )}

        {/* Leaflet Map Canvas with Marker Clustering */}
        <MapView
          pins={pins}
          onBoundsChange={handleBoundsChange}
          onSelectPin={handleSelectPin}
          selectedPinId={selectedPin?.id}
          center={mapCenter}
          zoom={activeSocialFilter === 'near_me' ? 14 : 12}
          autoFitPins={targetUser ? pins : undefined}
        />

        {/* Selected Pin Details Preview Drawer */}
        <PinPreviewDrawer
          pin={selectedPin}
          onClose={handleClosePin}
          onViewAllPins={handleViewAllPins}
        />
      </div>

      {/* Auth Modal Prompt for Guest Interaction */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab="login"
      />
    </div>
  );
};
