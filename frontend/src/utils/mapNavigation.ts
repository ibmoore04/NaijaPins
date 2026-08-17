/**
 * Shared Map Navigation & Discovery Utilities for NaijaPins
 */

export const mapNavigation = {
  /**
   * Generates URL to view a specific user's public pins on the map
   */
  getUserMapUrl(userId: string, userName?: string): string {
    const params = new URLSearchParams();
    params.set('user', userId);
    if (userName) {
      params.set('userName', userName);
    }
    return `/explore?${params.toString()}`;
  },

  /**
   * Generates URL to view memories for a specific hashtag
   */
  getTagMapUrl(hashtag: string): string {
    const cleanTag = hashtag.replace(/^#/, '');
    return `/explore?tag=${encodeURIComponent(cleanTag)}`;
  },

  /**
   * Generates URL for Near-Me discovery
   */
  getNearMeMapUrl(lat: number, lng: number, zoom = 14): string {
    return `/explore?filter=near_me&lat=${lat}&lng=${lng}&zoom=${zoom}`;
  },

  /**
   * Generates URL for social filter tabs
   */
  getSocialMapUrl(filter: 'all' | 'following' | 'followers' | 'my_memories' | 'recent' | 'popular'): string {
    if (filter === 'all') return '/explore';
    return `/explore?filter=${filter}`;
  },

  /**
   * Generates deep link URL for a memory post
   */
  getMemoryUrl(slugOrId: string): string {
    return `/memory/${slugOrId}`;
  },
};
