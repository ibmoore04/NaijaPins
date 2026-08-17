import { supabase } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const storageService = {
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    // 1. File Type Validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Please select a JPG, PNG, or WebP image.',
      };
    }

    // 2. File Size Validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: 'Image file size must be smaller than 5 MB.',
      };
    }

    try {
      const filePath = `${userId}/avatar.webp`;

      // 3. Upload / Replace avatar in Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 4. Retrieve Public Access URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // 5. Update profiles table avatar_url reference
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (dbError) {
        throw new Error(dbError.message);
      }

      return { success: true, avatarUrl };
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      return {
        success: false,
        error: err.message || 'Failed to upload profile photo. Please try again.',
      };
    }
  },

  async removeAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const filePath = `${userId}/avatar.webp`;

      // 1. Delete from Supabase Storage
      await supabase.storage.from('avatars').remove([filePath]);

      // 2. Set profiles.avatar_url = null
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (dbError) {
        throw new Error(dbError.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error removing avatar:', err);
      return {
        success: false,
        error: err.message || 'Failed to remove profile photo.',
      };
    }
  },
};
