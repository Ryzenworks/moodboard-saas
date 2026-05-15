import type { Database } from './database';

// ─── Row types ───────────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Board = Database['public']['Tables']['boards']['Row'];
export type BoardInsert = Database['public']['Tables']['boards']['Insert'];
export type Image = Database['public']['Tables']['images']['Row'];
export type ImageInsert = Database['public']['Tables']['images']['Insert'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type ImageCategory = Database['public']['Tables']['image_categories']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

// ─── Auth ────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

// ─── Plans ───────────────────────────────────────────
export type PlanType = 'free' | 'pro';

export interface PlanLimits {
  maxBoards: number;
  maxUploads: number;
  maxStorageMB: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxBoards: 3,
    maxUploads: 50,
    maxStorageMB: 500,
  },
  pro: {
    maxBoards: Infinity,
    maxUploads: Infinity,
    maxStorageMB: Infinity,
  },
};

// ─── Image with categories (joined) ─────────────────
export interface ImageWithCategories extends Image {
  categories: Category[];
}

// ─── Board with metadata ─────────────────────────────
export interface BoardWithMeta extends Board {
  _imageCount?: number;
  _previewUrls?: string[];
}

// ─── Sort ────────────────────────────────────────────
export type SortMode = 'newest' | 'oldest' | 'favorites';

// ─── Filter state ────────────────────────────────────
export interface FilterState {
  query: string;
  categories: Set<string>;
  favorites: boolean;
  uncategorized: boolean;
  colors: Set<string>;
}
