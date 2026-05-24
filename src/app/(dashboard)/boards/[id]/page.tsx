'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/topbar';
import { MasonryGrid } from '@/components/board/masonry-grid';
import { UploadZone } from '@/components/board/upload-zone';
import { Lightbox } from '@/components/board/lightbox';
import { FilterBar } from '@/components/board/filter-bar';
import { SortControl } from '@/components/board/sort-control';
import { ContextMenu } from '@/components/board/context-menu';
import { TagModal } from '@/components/board/tag-modal';
import { SelectionBar } from '@/components/board/selection-bar';
import { boardsService } from '@/services/boards';
import { imagesService } from '@/services/images';
import { categoriesService } from '@/services/categories';
import { useBoardStore } from '@/store/board';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard';
import { usePlan } from '@/hooks/use-plan';
import { useUploadManager } from '@/hooks/use-upload-manager';
import { downloadFile } from '@/utils/download';
import { UpgradeModal } from '@/components/billing/upgrade-modal';
import { useBoardsStore } from '@/store/boards';
import { NoteModal } from '@/components/ui/note-modal';
import { PromptModal } from '@/components/ui/prompt-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useRealtimeBoard } from '@/hooks/use-realtime-board';
import type { Board, Category } from '@/types';

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const user = useAuthStore((s) => s.user);
  const { uploadsRemaining } = usePlan();
  const incrementImageCount = useSubscriptionStore((s) => s.incrementImageCount);
  const updateBoardInList = useBoardsStore((s) => s.updateBoard);
  const { upload: handleUpload, cancelItem, cancelAll, isUploading } = useUploadManager(boardId, user?.id);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [noteModalImage, setNoteModalImage] = useState<{ id: string; note: string; url: string; filename: string } | null>(null);
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCatModalOpen, setBulkCatModalOpen] = useState(false);
  const fetchedRef = useRef(false);

  const {
    images,
    loading,
    categories,
    selected,
    setImages,
    updateImage,
    removeImage,
    setCategories,
    addCategory,
    setImageCategoryMap,
    tagImage,
    untagImage,
    setLoading,
    getFilteredSorted,
    toggleSelect,
    selectOnly,
    selectRange,
    clearSelection,
    selectAll,
    closeContextMenu,
    setQuery,
  } = useBoardStore();

  const [board, setBoard] = useState<Board | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [tagModalImageId, setTagModalImageId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Get filtered + sorted images — use store subscription for reactivity
  const sort = useBoardStore((s) => s.sort);
  const query = useBoardStore((s) => s.query);
  const filterCategoryIds = useBoardStore((s) => s.filterCategoryIds);
  const filterFavorites = useBoardStore((s) => s.filterFavorites);
  const filterUncategorized = useBoardStore((s) => s.filterUncategorized);
  const filterColors = useBoardStore((s) => s.filterColors);
  const imageCategoryMap = useBoardStore((s) => s.imageCategoryMap);

  const displayed = useMemo(
    () => getFilteredSorted(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images, sort, query, filterCategoryIds, filterFavorites, filterUncategorized, filterColors, imageCategoryMap]
  );

  // Load board data — only on first mount per boardId
  useEffect(() => {
    // Reset ref when boardId changes
    fetchedRef.current = false;
    return () => {
      clearSelection();
      closeContextMenu();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      // Only show skeleton if we have NO images yet (first visit)
      const hasExistingData = useBoardStore.getState().images.length > 0;
      if (!hasExistingData) setLoading(true);

      try {
        const [boardData, imagesData, categoriesData] = await Promise.all([
          boardsService.get(boardId),
          imagesService.listByBoard(boardId),
          categoriesService.listByBoard(boardId),
        ]);
        setBoard(boardData);
        setImages(imagesData);
        setCategories(categoriesData);

        // Load image-category map
        const catMap = await categoriesService.getImageCategoryMap(boardId);
        setImageCategoryMap(catMap);
      } catch {
        // Don't wipe existing data
        if (!useBoardStore.getState().images.length) setImages([]);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // ─── Realtime sync (extension uploads appear instantly) ───
  useRealtimeBoard(boardId);

  // ─── Listen for upgrade trigger from UploadZone ───
  useEffect(() => {
    function onUpgrade() { setUpgradeOpen(true); }
    window.addEventListener('moodboard:upgrade', onUpgrade);
    return () => window.removeEventListener('moodboard:upgrade', onUpgrade);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onSelectAll: () => selectAll(),
    onClearSelection: () => clearSelection(),
    onDelete: () => {
      if (selected.size > 0) handleBulkDelete();
    },
    onEscape: () => {
      if (lightboxId) setLightboxId(null);
      else if (selected.size) clearSelection();
      else closeContextMenu();
    },
    onFavorite: () => {
      if (selected.size > 0) handleBulkFavorite();
    },
  });



  // ─── Clipboard paste upload (Ctrl/Cmd + V) ─────────
  const handleUploadRef = useRef(handleUpload);
  handleUploadRef.current = handleUpload;

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      // Don't intercept paste in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const ACCEPTED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
      const files: File[] = [];

      for (const item of Array.from(items)) {
        if (ACCEPTED.has(item.type)) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleUploadRef.current(files);
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  // ─── Image actions ─────────────────────────────────
  async function handleFavorite(id: string, current: boolean) {
    updateImage(id, { is_favorite: !current });
    try {
      await imagesService.toggleFavorite(id, current);
    } catch (err) {
      console.error('[Favorite] Failed:', err);
    }
  }

  async function handleDelete(id: string, storagePath: string) {
    removeImage(id);
    const newCount = useBoardStore.getState().images.length;
    updateBoardInList(boardId, { image_count: newCount });
    incrementImageCount(-1);
    console.log(`[CountSync] delete: boardId=${boardId} count=${newCount}`);
    boardsService.syncImageCount(boardId, newCount).catch(() => {});
    try {
      await imagesService.remove(id, storagePath);
    } catch (err) {
      console.error('[Delete] Failed:', err);
    }
  }

  async function handleNoteUpdate(id: string, note: string) {
    // __EDIT__ is a signal from image card double-click — open modal instead
    if (note === '__EDIT__') {
      handleNoteEdit(id);
      return;
    }
    updateImage(id, { note });
    try {
      await imagesService.updateNote(id, note);
    } catch (err) {
      console.error('[Note] Update failed:', err);
    }
  }

  function handleNoteEdit(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) {
      setNoteModalImage({ id: img.id, note: img.note || '', url: img.url, filename: img.filename });
    }
  }

  async function handleCopy(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) {
      try {
        const res = await fetch(img.url);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      } catch {
        try {
          await navigator.clipboard.writeText(img.url);
        } catch (err) {
          console.error('[Copy] Failed:', err);
        }
      }
    }
  }

  // ─── Category actions ──────────────────────────────
  async function handleTag(imageId: string, categoryId: string) {
    tagImage(imageId, categoryId);
    try {
      await categoriesService.tagImage(imageId, categoryId);
    } catch (err) {
      console.error('[Tag] Failed:', err);
    }
  }

  async function handleUntag(imageId: string, categoryId: string) {
    untagImage(imageId, categoryId);
    try {
      await categoriesService.untagImage(imageId, categoryId);
    } catch (err) {
      console.error('[Untag] Failed:', err);
    }
  }

  async function handleCreateCategory(name: string): Promise<Category | undefined> {
    if (!user) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    try {
      const cat = await categoriesService.create(boardId, user.id, name);
      addCategory(cat);
      return cat;
    } catch (err) {
      console.error('[Category] Create failed:', err);
      return undefined;
    }
  }

  function handleNewCategory() {
    setNewCatModalOpen(true);
  }

  // ─── Bulk actions ──────────────────────────────────
  function handleBulkDelete() {
    setBulkDeleteOpen(true);
  }

  function executeBulkDelete() {
    for (const id of selected) {
      const img = images.find((i) => i.id === id);
      if (img) handleDelete(img.id, img.storage_path);
    }
    clearSelection();
  }

  function handleBulkFavorite() {
    for (const id of selected) {
      const img = images.find((i) => i.id === id);
      if (img) handleFavorite(img.id, img.is_favorite);
    }
  }

  function handleBulkTag() {
    if (selected.size === 1) {
      setTagModalImageId(Array.from(selected)[0]);
    } else {
      setBulkCatModalOpen(true);
    }
  }

  function handleBulkDownload() {
    for (const id of selected) {
      const img = images.find((i) => i.id === id);
      if (img) downloadFile(img.url, img.filename);
    }
  }

  // ─── Render ────────────────────────────────────────
  if (!board && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-sm">Board not found</p>
      </div>
    );
  }

  return (
    <>
      <Topbar
        title={board?.name ?? 'Loading...'}
        subtitle={`${images.length} image${images.length !== 1 ? 's' : ''}${displayed.length !== images.length ? ` · ${displayed.length} shown` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <SortControl />
            <UploadZone onDrop={handleUpload} onCancelItem={cancelItem} onCancelAll={cancelAll} uploadsRemaining={uploadsRemaining} compact />
          </div>
        }
      />

      {/* Back + Search row */}
      <div className="px-6 pt-4 flex items-center justify-between gap-4">
        <Link
          href="/boards"
          className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />
          All Boards
        </Link>

        {images.length > 0 && (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search images... (press /)"
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 outline-none focus:bg-white/[0.06] focus:border-white/[0.1] transition-all"
            />
          </div>
        )}
      </div>

      {/* Filter bar */}
      {images.length > 0 && (
        <div className="px-6 pt-4">
          <FilterBar onNewCategory={handleNewCategory} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-6">
        {loading && images.length === 0 ? (
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-4">
                {[200, 260, 180].map((h, i) => (
                  <div key={i} className="skeleton rounded-xl" style={{ height: `${h + colIdx * 20}px` }} />
                ))}
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <UploadZone onDrop={handleUpload} uploadsRemaining={uploadsRemaining} />
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-white/30 mb-2">No images match your filters</p>
            <button
              onClick={() => useBoardStore.getState().clearFilters()}
              className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <MasonryGrid
            images={displayed}
            onFavorite={handleFavorite}
            onDelete={handleDelete}
            onNoteUpdate={handleNoteUpdate}
            onImageClick={(id, e) => {
              if (e.shiftKey && lastSelectedId) {
                // Shift+click: range select from last to current
                e.preventDefault();
                selectRange(lastSelectedId, id);
                setLastSelectedId(id);
              } else if (e.ctrlKey || e.metaKey) {
                // Ctrl/Cmd+click: toggle individual
                e.preventDefault();
                toggleSelect(id);
                setLastSelectedId(id);
              } else {
                // Normal click: open lightbox, clear selection
                clearSelection();
                setLastSelectedId(id);
                setLightboxId(id);
              }
            }}
          />
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        images={displayed}
        activeId={lightboxId}
        onClose={() => setLightboxId(null)}
        onNavigate={(id) => setLightboxId(id)}
        onFavorite={handleFavorite}
        onDelete={handleDelete}
      />

      {/* Context menu */}
      <ContextMenu
        onFavorite={handleFavorite}
        onDelete={handleDelete}
        onNoteEdit={handleNoteEdit}
        onTag={handleTag}
        onUntag={handleUntag}
        onCreateCategory={handleCreateCategory}
        onCopy={handleCopy}
      />

      {/* Tag modal */}
      {tagModalImageId && (
        <TagModal
          imageId={tagModalImageId}
          onClose={() => setTagModalImageId(null)}
          onTag={handleTag}
          onUntag={handleUntag}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {/* Selection bar */}
      <SelectionBar
        count={selected.size}
        totalVisible={displayed.length}
        onClear={clearSelection}
        onSelectAll={selectAll}
        onDelete={handleBulkDelete}
        onFavorite={handleBulkFavorite}
        onTag={handleBulkTag}
        onDownload={handleBulkDownload}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="upload_limit"
      />

      {/* Note modal */}
      <NoteModal
        open={!!noteModalImage}
        onClose={() => setNoteModalImage(null)}
        onSave={(note) => {
          if (noteModalImage) handleNoteUpdate(noteModalImage.id, note);
        }}
        initialNote={noteModalImage?.note ?? ''}
        imageUrl={noteModalImage?.url}
        filename={noteModalImage?.filename}
      />

      {/* New category modal */}
      <PromptModal
        open={newCatModalOpen}
        onClose={() => setNewCatModalOpen(false)}
        onSubmit={(name) => handleCreateCategory(name)}
        title="New Category"
        placeholder="Category name"
        submitLabel="Create"
      />

      {/* Bulk delete confirm */}
      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={executeBulkDelete}
        title="Delete Images"
        message={`${selected.size} image(s) will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete All"
        danger
      />

      {/* Bulk category modal */}
      <PromptModal
        open={bulkCatModalOpen}
        onClose={() => setBulkCatModalOpen(false)}
        onSubmit={(name) => {
          handleCreateCategory(name)
            .then((cat) => {
              if (cat) {
                for (const id of selected) handleTag(id, cat.id);
              }
            })
            .catch((err) => console.error('[BulkTag] Failed:', err));
        }}
        title={`Tag ${selected.size} Images`}
        placeholder="Category name"
        submitLabel="Apply"
      />
    </>
  );
}
