import { createClient } from '@/lib/supabase/client';
import { toError } from '@/utils/to-error';
import type { Board } from '@/types';

export const boardsService = {
  async list(): Promise<Board[]> {
    const supabase = createClient();
    const { data: boards, error } = await supabase
      .from('boards')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw toError(error);

    if (!boards || boards.length === 0) return [];
    const boardList = boards as Board[];

    // Get actual image counts per board in one query
    const { data: counts } = await supabase
      .from('images')
      .select('board_id')
      .in('board_id', boardList.map((b) => b.id));

    const countMap: Record<string, number> = {};
    const countRows = (counts ?? []) as { board_id: string }[];
    for (const row of countRows) {
      countMap[row.board_id] = (countMap[row.board_id] || 0) + 1;
    }

    return boardList.map((b) => ({
      ...b,
      image_count: countMap[b.id] || 0,
    })) as Board[];
  },

  async get(id: string): Promise<Board | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw toError(error);
    return data as Board;
  },

  async create(board: { user_id: string; name: string; description?: string | null; color?: string }): Promise<Board> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('boards') as any)
      .insert(board)
      .select()
      .single();
    if (error) throw toError(error);
    return data as Board;
  },

  async update(id: string, updates: Partial<Board>): Promise<Board> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('boards') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw toError(error);
    return data as Board;
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('boards').delete().eq('id', id);
    if (error) throw toError(error);
  },

  async getCount(userId: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw toError(error);
    return count ?? 0;
  },

  /** Sync the image_count column in DB to match actual count */
  async syncImageCount(boardId: string, count: number): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('boards') as any)
      .update({ image_count: count, updated_at: new Date().toISOString() })
      .eq('id', boardId);
    if (error) console.warn('[syncImageCount] Failed:', error.message);
  },
};
