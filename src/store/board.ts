import { create } from 'zustand';
import type { Image, Category, SortMode } from '@/types';

interface BoardState {
  // Data
  images: Image[];
  categories: Category[];
  imageCategoryMap: Record<string, string[]>; // imageId -> categoryId[]
  loading: boolean;

  // Filters & Sort
  sort: SortMode;
  query: string;
  filterCategoryIds: Set<string>;
  filterFavorites: boolean;
  filterUncategorized: boolean;
  filterColors: Set<string>;

  // Selection
  selected: Set<string>;

  // Context menu
  contextMenuImageId: string | null;
  contextMenuPosition: { x: number; y: number } | null;

  // Actions — data
  setImages: (images: Image[]) => void;
  addImage: (image: Image) => void;
  addImages: (images: Image[]) => void;
  updateImage: (id: string, updates: Partial<Image>) => void;
  removeImage: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
  setImageCategoryMap: (map: Record<string, string[]>) => void;
  tagImage: (imageId: string, categoryId: string) => void;
  untagImage: (imageId: string, categoryId: string) => void;
  setLoading: (loading: boolean) => void;

  // Actions — filters
  setSort: (sort: SortMode) => void;
  setQuery: (query: string) => void;
  toggleCategoryFilter: (catId: string) => void;
  setFilterFavorites: (fav: boolean) => void;
  setFilterUncategorized: (uncat: boolean) => void;
  toggleColorFilter: (color: string) => void;
  clearFilters: () => void;

  // Actions — selection
  toggleSelect: (id: string) => void;
  selectOnly: (id: string) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // Actions — context menu
  openContextMenu: (imageId: string, x: number, y: number) => void;
  closeContextMenu: () => void;

  // Computed
  getFilteredSorted: () => Image[];
}

const COLORS_MAP: Record<string, [number, number, number]> = {
  Red: [229, 57, 53],
  Orange: [251, 140, 0],
  Yellow: [253, 216, 53],
  Green: [67, 160, 71],
  Teal: [0, 137, 123],
  Blue: [30, 136, 229],
  Purple: [142, 36, 170],
  Pink: [216, 27, 96],
  White: [238, 238, 238],
  Gray: [136, 136, 136],
  Black: [34, 34, 34],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export const useBoardStore = create<BoardState>((set, get) => ({
  images: [],
  categories: [],
  imageCategoryMap: {},
  loading: false,
  sort: 'newest',
  query: '',
  filterCategoryIds: new Set(),
  filterFavorites: false,
  filterUncategorized: false,
  filterColors: new Set(),
  selected: new Set(),
  contextMenuImageId: null,
  contextMenuPosition: null,

  // Data
  setImages: (images) => set({ images, loading: false }),
  addImage: (image) => set((s) => ({ images: [image, ...s.images] })),
  addImages: (images) => set((s) => ({ images: [...images, ...s.images] })),
  updateImage: (id, updates) =>
    set((s) => ({
      images: s.images.map((img) => (img.id === id ? { ...img, ...updates } : img)),
    })),
  removeImage: (id) =>
    set((s) => ({
      images: s.images.filter((img) => img.id !== id),
      selected: (() => { const n = new Set(s.selected); n.delete(id); return n; })(),
    })),
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((s) => ({ categories: [...s.categories, category] })),
  removeCategory: (id) =>
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      filterCategoryIds: (() => { const n = new Set(s.filterCategoryIds); n.delete(id); return n; })(),
    })),
  setImageCategoryMap: (map) => set({ imageCategoryMap: map }),
  tagImage: (imageId, categoryId) =>
    set((s) => {
      const map = { ...s.imageCategoryMap };
      if (!map[imageId]) map[imageId] = [];
      if (!map[imageId].includes(categoryId)) map[imageId] = [...map[imageId], categoryId];
      return { imageCategoryMap: map };
    }),
  untagImage: (imageId, categoryId) =>
    set((s) => {
      const map = { ...s.imageCategoryMap };
      if (map[imageId]) map[imageId] = map[imageId].filter((c) => c !== categoryId);
      return { imageCategoryMap: map };
    }),
  setLoading: (loading) => set({ loading }),

  // Filters
  setSort: (sort) => set({ sort }),
  setQuery: (query) => set({ query }),
  toggleCategoryFilter: (catId) =>
    set((s) => {
      const n = new Set(s.filterCategoryIds);
      if (n.has(catId)) n.delete(catId); else n.add(catId);
      return { filterCategoryIds: n, filterFavorites: false, filterUncategorized: false };
    }),
  setFilterFavorites: (fav) =>
    set({ filterFavorites: fav, filterCategoryIds: new Set(), filterUncategorized: false }),
  setFilterUncategorized: (uncat) =>
    set({ filterUncategorized: uncat, filterCategoryIds: new Set(), filterFavorites: false }),
  toggleColorFilter: (color) =>
    set((s) => {
      const n = new Set(s.filterColors);
      if (n.has(color)) n.delete(color); else n.add(color);
      return { filterColors: n };
    }),
  clearFilters: () =>
    set({ filterCategoryIds: new Set(), filterFavorites: false, filterUncategorized: false, filterColors: new Set(), query: '' }),

  // Selection
  toggleSelect: (id) =>
    set((s) => {
      const n = new Set(s.selected);
      if (n.has(id)) n.delete(id); else n.add(id);
      return { selected: n };
    }),
  selectOnly: (id) => set({ selected: new Set([id]) }),
  selectRange: (fromId, toId) => {
    const displayed = get().getFilteredSorted();
    const fromIdx = displayed.findIndex((i) => i.id === fromId);
    const toIdx = displayed.findIndex((i) => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeIds = displayed.slice(start, end + 1).map((i) => i.id);
    set({ selected: new Set(rangeIds) });
  },
  selectAll: () =>
    set((s) => ({ selected: new Set(s.getFilteredSorted().map((i) => i.id)) })),
  clearSelection: () => set({ selected: new Set() }),
  isSelected: (id) => get().selected.has(id),

  // Context menu
  openContextMenu: (imageId, x, y) =>
    set({ contextMenuImageId: imageId, contextMenuPosition: { x, y } }),
  closeContextMenu: () =>
    set({ contextMenuImageId: null, contextMenuPosition: null }),

  // Computed
  getFilteredSorted: () => {
    const s = get();
    let result = [...s.images];

    // Search
    if (s.query) {
      const q = s.query.toLowerCase();
      result = result.filter(
        (img) =>
          img.filename.toLowerCase().includes(q) ||
          img.note.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (s.filterCategoryIds.size > 0) {
      result = result.filter((img) => {
        const cats = s.imageCategoryMap[img.id] || [];
        return cats.some((c) => s.filterCategoryIds.has(c));
      });
    }

    // Favorites
    if (s.filterFavorites) {
      result = result.filter((img) => img.is_favorite);
    }

    // Uncategorized
    if (s.filterUncategorized) {
      result = result.filter((img) => {
        const cats = s.imageCategoryMap[img.id] || [];
        return cats.length === 0;
      });
    }

    // Color filter
    if (s.filterColors.size > 0) {
      result = result.filter((img) =>
        img.palette.some((hex) => {
          const rgb = hexToRgb(hex);
          for (const colorName of s.filterColors) {
            const target = COLORS_MAP[colorName];
            if (target && colorDist(rgb, target) < 100) return true;
          }
          return false;
        })
      );
    }

    // Sort
    switch (s.sort) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'favorites':
        result.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default: // newest
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  },
}));
