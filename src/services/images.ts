import { createClient } from '@/lib/supabase/client';
import { toError } from '@/utils/to-error';
import type { Image } from '@/types';
import imageCompression from 'browser-image-compression';

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'extracting' | 'done' | 'error';
  error?: string;
}

export const imagesService = {
  async listByBoard(boardId: string): Promise<Image[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    if (error) throw toError(error);
    return (data ?? []) as Image[];
  },

  /** Check if a fingerprint already exists on this board (DB-level) */
  async checkDuplicate(boardId: string, fingerprint: string): Promise<boolean> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('images')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', boardId)
      .eq('fingerprint', fingerprint);
    if (error) {
      console.warn('[DuplicateCheck] DB query failed:', error);
      return false; // Fail open — don't block uploads on query failure
    }
    return (count ?? 0) > 0;
  },

  async upload(
    file: File,
    boardId: string,
    userId: string,
    onProgress?: (p: UploadProgress) => void,
    fingerprint?: string
  ): Promise<Image> {
    const supabase = createClient();
    const filename = file.name;
    const update = (p: Partial<UploadProgress>) =>
      onProgress?.({ filename, progress: 0, status: 'pending', ...p });

    // ── Step 1: Compress ──────────────────────────────
    update({ status: 'compressing', progress: 10 });
    let compressed: File;
    try {
      compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: 'image/webp',
      });
    } catch (err) {
      console.warn('[Upload] Compression failed, using original:', err);
      compressed = file;
    }

    // ── Step 2: Get dimensions ────────────────────────
    const dimensions = await getImageDimensions(compressed);
    console.log('[Upload] Dimensions:', dimensions);

    // ── Step 3: Upload to Supabase Storage ────────────
    update({ status: 'uploading', progress: 40 });
    const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'png';
    const storagePath = `${userId}/${boardId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    console.log('[Upload] Storage path:', storagePath);
    console.log('[Upload] File size:', compressed.size, 'type:', compressed.type);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, compressed, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] ❌ Storage upload failed:', uploadError);
      update({ status: 'error', progress: 0, error: uploadError.message });
      throw uploadError;
    }

    console.log('[Upload] ✅ Storage upload success:', uploadData);

    // ── Step 4: Get public URL ────────────────────────
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log('[Upload] Public URL:', publicUrl);

    if (!publicUrl) {
      const err = new Error('Failed to get public URL for uploaded image');
      console.error('[Upload] ❌ Public URL failed');
      update({ status: 'error', progress: 0, error: err.message });
      throw err;
    }

    update({ status: 'extracting', progress: 80 });

    // ── Step 5: Insert image record ───────────────────
    // IMPORTANT: sort_order must fit in PostgreSQL int4 range (-2147483648 to 2147483647)
    // Date.now() is ~1.7 trillion which overflows. Use a safe counter instead.
    const sortOrder = Math.floor(Date.now() / 1000) % 2147483647;

    const basePayload = {
      board_id: boardId,
      user_id: userId,
      filename,
      storage_path: storagePath,
      url: publicUrl,
      width: dimensions.width || null,
      height: dimensions.height || null,
      size_bytes: compressed.size,
      note: '',
      is_favorite: false,
      palette: '{}', // PostgreSQL text[] literal for empty array
      sort_order: sortOrder,
    };

    // Try with fingerprint first, fallback without if column doesn't exist yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;
    let insertError: any = null;

    // Attempt 1: with fingerprint
    if (fingerprint) {
      const result = await (supabase.from('images') as any)
        .insert({ ...basePayload, fingerprint })
        .select()
        .single();
      data = result.data;
      insertError = result.error;

      // If it failed (likely missing column), retry without fingerprint
      if (insertError) {
        console.warn('[Upload] Insert with fingerprint failed, retrying without:', insertError.message);
        const retry = await (supabase.from('images') as any)
          .insert(basePayload)
          .select()
          .single();
        data = retry.data;
        insertError = retry.error;
      }
    } else {
      const result = await (supabase.from('images') as any)
        .insert(basePayload)
        .select()
        .single();
      data = result.data;
      insertError = result.error;
    }

    if (insertError) {
      console.error('[Upload] ❌ DB insert failed:', insertError);
      console.error('[Upload] Error code:', insertError.code);
      console.error('[Upload] Error details:', insertError.details);
      console.error('[Upload] Error hint:', insertError.hint);
      // Clean up: delete the orphaned storage file
      try {
        await supabase.storage.from('images').remove([storagePath]);
      } catch {
        // ignore cleanup failure
      }
      update({ status: 'error', progress: 0, error: insertError.message });
      throw insertError;
    }

    console.log('[Upload] ✅ DB insert success:', data);

    // ── Step 6: Update board timestamp ────────────────
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('boards') as any)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', boardId);
    } catch (err) {
      console.warn('[Upload] Board update failed (non-critical):', err);
    }

    update({ status: 'done', progress: 100 });
    return data as Image;
  },

  async toggleFavorite(id: string, current: boolean): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('images') as any)
      .update({ is_favorite: !current })
      .eq('id', id);
    if (error) throw toError(error);
  },

  async updateNote(id: string, note: string): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('images') as any)
      .update({ note })
      .eq('id', id);
    if (error) throw toError(error);
  },

  async updatePalette(id: string, palette: string[]): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('images') as any)
      .update({ palette })
      .eq('id', id);
    if (error) throw toError(error);
  },

  async remove(id: string, storagePath: string): Promise<void> {
    const supabase = createClient();
    await supabase.storage.from('images').remove([storagePath]);
    const { error } = await supabase.from('images').delete().eq('id', id);
    if (error) throw toError(error);
  },

  async getCountByUser(userId: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw toError(error);
    return count ?? 0;
  },
};

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      console.warn('[Upload] Failed to read image dimensions');
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
}
