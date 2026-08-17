import { supabase } from '@/lib/supabase';
import { Memory } from '@/types/database';

export const savedMemoriesService = {
  async getSavedMemories(userId: string): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('saved_memories')
      .select(`
        created_at,
        memory:memories(*, location:locations(*), category:categories(*))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching saved memories:', error?.message);
      return [];
    }

    return data.map((item: any) => item.memory).filter(Boolean) as Memory[];
  },

  async isMemorySaved(userId: string, memoryId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('saved_memories')
        .select('id')
        .eq('user_id', userId)
        .eq('memory_id', memoryId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if memory is saved:', error.message);
        return false;
      }

      return !!data;
    } catch {
      return false;
    }
  },

  async saveMemory(userId: string, memoryId: string): Promise<boolean> {
    const { error } = await supabase
      .from('saved_memories')
      .insert({ user_id: userId, memory_id: memoryId });

    return !error;
  },

  async unsaveMemory(userId: string, memoryId: string): Promise<boolean> {
    const { error } = await supabase
      .from('saved_memories')
      .delete()
      .eq('user_id', userId)
      .eq('memory_id', memoryId);

    return !error;
  },
};
