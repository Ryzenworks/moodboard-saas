import { createClient } from '@/lib/supabase/client';
import { toError } from '@/utils/to-error';
import type { Category } from '@/types';

export const categoriesService = {
  async listByBoard(boardId: string): Promise<Category[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('board_id', boardId)
      .order('name');
    if (error) throw toError(error);
    return (data ?? []) as Category[];
  },

  async create(boardId: string, userId: string, name: string): Promise<Category> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('categories') as any)
      .insert({ board_id: boardId, user_id: userId, name })
      .select()
      .single();
    if (error) throw toError(error);
    return data as Category;
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw toError(error);
  },

  async getImageCategories(imageId: string): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('image_categories')
      .select('category_id')
      .eq('image_id', imageId);
    if (error) throw toError(error);
    return (data ?? []).map((r) => (r as { category_id: string }).category_id);
  },

  async tagImage(imageId: string, categoryId: string): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('image_categories') as any)
      .insert({ image_id: imageId, category_id: categoryId });
  },

  async untagImage(imageId: string, categoryId: string): Promise<void> {
    const supabase = createClient();
    await supabase
      .from('image_categories')
      .delete()
      .eq('image_id', imageId)
      .eq('category_id', categoryId);
  },

  async getImageCategoryMap(boardId: string): Promise<Record<string, string[]>> {
    const supabase = createClient();
    // Join image_categories with images to filter by board
    const { data, error } = await supabase
      .from('image_categories')
      .select('image_id, category_id, images!inner(board_id)')
      .eq('images.board_id', boardId);
    if (error) throw toError(error);

    const map: Record<string, string[]> = {};
    for (const row of (data ?? []) as Array<{ image_id: string; category_id: string }>) {
      if (!map[row.image_id]) map[row.image_id] = [];
      map[row.image_id].push(row.category_id);
    }
    return map;
  },
};
