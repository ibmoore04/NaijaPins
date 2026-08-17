import { supabase } from '@/lib/supabase';
import { Memory, MemoryStatus } from '@/types/database';
import { LocationData } from '@/components/memory/LocationPickerStep';
import { StoryFormData } from '@/components/memory/StoryFormStep';
import { MediaFileItem } from '@/components/memory/MediaUploadStep';

export interface CreateMemoryParams {
  userId: string;
  location: LocationData;
  story: StoryFormData;
  media: MediaFileItem[];
  community_posted?: boolean;
  status?: MemoryStatus;
}

export const memoriesService = {
  // Create memory with location and media, setting moderation status and community_posted flag
  async createMemory(params: CreateMemoryParams): Promise<{
    success: boolean;
    memoryId?: string;
    slug?: string;
    error?: string;
  }> {
    try {
      // 1. Insert Location
      const { data: locationRecord, error: locError } = await supabase
        .from('locations')
        .insert({
          country: 'Nigeria',
          state: params.location.state,
          lga: params.location.lga || params.location.city,
          city: params.location.city,
          neighborhood: params.location.neighborhood || null,
          formatted_address: params.location.formatted_address,
          latitude: params.location.latitude,
          longitude: params.location.longitude,
        })
        .select()
        .single();

      if (locError || !locationRecord) {
        throw new Error(locError?.message || 'Failed to create location record.');
      }

      // Generate unique slug
      const slugBase = params.story.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const uniqueSlug = `${slugBase}-${Date.now().toString(36)}`;

      // 2. Insert Memory
      // Default to 'pending_review' moderation status and user's community_posted preference
      const memoryStatus = params.status || 'pending_review';
      const isCommunityPosted = params.community_posted ?? false;

      const { data: memoryRecord, error: memError } = await supabase
        .from('memories')
        .insert({
          user_id: params.userId,
          title: params.story.title,
          slug: uniqueSlug,
          story: params.story.story,
          date_type: params.story.date_type,
          year: params.story.year,
          end_year: params.story.end_year || null,
          exact_date: params.story.exact_date || null,
          location_id: locationRecord.id,
          category_id: params.story.category_id,
          status: memoryStatus,
          community_posted: isCommunityPosted,
          is_deleted: false,
        })
        .select()
        .single();

      if (memError || !memoryRecord) {
        let msg = memError?.message || 'Failed to save memory.';
        if (msg.includes('memories_story_check')) {
          msg = 'Your memory story is too short. Please write at least 30 characters to preserve this Nigerian heritage moment.';
        } else if (msg.includes('memories_title_check')) {
          msg = 'The memory title must be between 5 and 150 characters.';
        } else if (msg.includes('memories_year_check')) {
          msg = 'The selected year must be between 1900 and 2100.';
        } else if (msg.includes('memories_category_id_fkey')) {
          msg = 'The selected category is invalid. Please select an active category from the list.';
        } else if (msg.includes('memories_location_id_fkey')) {
          msg = 'Location record could not be linked. Please tag your location again.';
        } else if (msg.includes('memories_user_id_fkey')) {
          msg = 'User profile could not be verified. Please sign in again.';
        }
        throw new Error(msg);
      }

      // 3. Upload & Insert Media (if any)
      for (let i = 0; i < params.media.length; i++) {
        const item = params.media[i];
        const fileExt = item.file.name.split('.').pop() || 'jpg';
        const filePath = `${memoryRecord.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('memory_media')
          .upload(filePath, item.file, {
            contentType: item.file.type,
            upsert: true,
          });

        if (uploadErr) {
          throw new Error(`Failed to upload media file "${item.file.name}": ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from('memory_media').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        await supabase.from('memory_media').insert({
          memory_id: memoryRecord.id,
          media_type: item.type,
          file_path: filePath,
          file_url: publicUrl,
          mime_type: item.file.type || 'application/octet-stream',
          file_size: item.file.size,
          display_order: i,
        });
      }

      return { success: true, memoryId: memoryRecord.id, slug: uniqueSlug };
    } catch (err: any) {
      console.error('Error creating memory:', err);
      return { success: false, error: err?.message || 'Failed to create memory.' };
    }
  },

  // Helper alias to create memory as a private draft
  async createMemoryAsDraft(params: CreateMemoryParams): Promise<{
    success: boolean;
    memoryId?: string;
    slug?: string;
    error?: string;
  }> {
    return this.createMemory({
      ...params,
      status: 'draft',
      community_posted: false,
    });
  },

  // Explicit action by memory owner to publish/share to the Community
  async postToCommunity(memoryId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return this.setCommunityPosted(memoryId, true, userId);
  },

  // Explicit action by memory owner to remove/unpost from the Community
  async unpostFromCommunity(memoryId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return this.setCommunityPosted(memoryId, false, userId);
  },

  // Update community_posted toggle on an existing memory row
  async setCommunityPosted(
    memoryId: string,
    posted: boolean,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let query = supabase
        .from('memories')
        .update({
          community_posted: posted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating community_posted status:', err);
      return { success: false, error: err?.message || 'Failed to update community posting.' };
    }
  },

  // Approve / Publish memory moderation status (updates status='published', does NOT change community_posted)
  async publishMemory(memoryId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let query = supabase
        .from('memories')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error publishing memory:', err);
      return { success: false, error: err?.message || 'Failed to publish memory.' };
    }
  },

  // Save memory as draft
  async saveMemoryAsDraft(memoryId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let query = supabase
        .from('memories')
        .update({
          status: 'draft',
          community_posted: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving memory as draft:', err);
      return { success: false, error: err?.message || 'Failed to update draft.' };
    }
  },

  // Get user's memories for dashboard
  async getUserMemories(
    userId: string,
    options?: {
      status?: MemoryStatus | 'ALL';
      searchQuery?: string;
      limit?: number;
    }
  ): Promise<Memory[]> {
    let query = supabase
      .from('memories')
      .select('*, location:locations(*), category:categories(*)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'ALL') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching user memories:', error.message);
      return [];
    }

    let results = (data || []) as Memory[];

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.story.toLowerCase().includes(q) ||
          m.location?.city?.toLowerCase().includes(q) ||
          m.location?.state?.toLowerCase().includes(q)
      );
    }

    return results;
  },

  // Soft delete memory
  async softDeleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const { error } = await supabase
      .from('memories')
      .update({ is_deleted: true })
      .eq('id', memoryId)
      .eq('user_id', userId);

    return !error;
  },
};
