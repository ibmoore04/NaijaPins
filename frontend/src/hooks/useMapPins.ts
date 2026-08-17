import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MapBounds, MapPin, SocialMapFilter } from '@/types/database';

interface UseMapPinsParams {
  bounds: MapBounds | null;
  startYear?: number;
  endYear?: number;
  categoryId?: string | null;
  currentUserId?: string | null;
  socialFilter?: SocialMapFilter;
  userIdFilter?: string | null;
  searchQuery?: string | null;
  hashtag?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusKm?: number | null;
}

export const useMapPins = ({
  bounds,
  startYear = 1960,
  endYear = 2030,
  categoryId = null,
  currentUserId = null,
  socialFilter = 'all',
  userIdFilter = null,
  searchQuery = null,
  hashtag = null,
  centerLat = null,
  centerLng = null,
  radiusKm = null,
}: UseMapPinsParams) => {
  return useQuery<MapPin[]>({
    queryKey: [
      'mapPins',
      bounds,
      startYear,
      endYear,
      categoryId,
      currentUserId,
      socialFilter,
      userIdFilter,
      searchQuery,
      hashtag,
      centerLat,
      centerLng,
      radiusKm,
    ],
    queryFn: async () => {
      // If we have a specific user filter or near-me center, we don't strictly require bounds
      if (!bounds && !userIdFilter && !centerLat) return [];

      const { data, error } = await supabase.rpc('get_map_pins_in_bounds', {
        min_lat: bounds ? bounds.min_lat : null,
        max_lat: bounds ? bounds.max_lat : null,
        min_lng: bounds ? bounds.min_lng : null,
        max_lng: bounds ? bounds.max_lng : null,
        start_year: startYear,
        end_year: endYear,
        category_id_filter: categoryId || null,
        p_current_user_id: currentUserId || null,
        p_social_filter: socialFilter,
        p_user_id_filter: userIdFilter || null,
        p_search_query: searchQuery || null,
        p_hashtag: hashtag || null,
        p_center_lat: centerLat || null,
        p_center_lng: centerLng || null,
        p_radius_km: radiusKm || null,
      });

      if (error) {
        console.error('Error fetching map pins RPC:', error);
        throw new Error(error.message);
      }

      return (data || []) as MapPin[];
    },
    enabled: !!bounds || !!userIdFilter || !!centerLat,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};
