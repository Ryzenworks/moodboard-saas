'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { BoardCard } from '@/components/boards/board-card';
import { CreateBoardModal } from '@/components/boards/create-board-modal';
import { UpgradeModal } from '@/components/billing/upgrade-modal';
import { boardsService } from '@/services/boards';
import { useBoardsStore } from '@/store/boards';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { usePlan } from '@/hooks/use-plan';

// Memoize BoardCard to prevent rerender on parent state changes
const MemoizedBoardCard = memo(BoardCard);

export default function BoardsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const fetchedRef = useRef(false);

  const boards = useBoardsStore((s) => s.boards);
  const loading = useBoardsStore((s) => s.loading);
  const initialized = useBoardsStore((s) => s.initialized);
  const setBoards = useBoardsStore((s) => s.setBoards);
  const addBoard = useBoardsStore((s) => s.addBoard);
  const removeBoard = useBoardsStore((s) => s.removeBoard);
  const updateBoard = useBoardsStore((s) => s.updateBoard);
  const setLoading = useBoardsStore((s) => s.setLoading);

  const user = useAuthStore((s) => s.user);
  const setUsage = useSubscriptionStore((s) => s.setUsage);
  const setBoardCount = useSubscriptionStore((s) => s.setBoardCount);
  const { checkBoardLimit } = usePlan();

  useEffect(() => {
    // Prevent double-fetch from StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      // Only show loading skeleton on very first visit
      if (!initialized) setLoading(true);
      try {
        const data = await boardsService.list();
        setBoards(data);
        // Derive total image count from boards' image_count
        const totalImages = data.reduce((sum, b) => sum + (b.image_count || 0), 0);
        setUsage(data.length, totalImages);
      } catch {
        // Don't wipe existing boards on error — only set empty if never initialized
        if (!initialized) setBoards([]);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNewBoard() {
    const { allowed } = checkBoardLimit();
    if (!allowed) {
      setUpgradeOpen(true);
      return;
    }
    setModalOpen(true);
  }

  async function handleCreate(name: string, description: string, color: string) {
    if (!user) return;
    try {
      const board = await boardsService.create({
        user_id: user.id,
        name,
        description: description || null,
        color,
      });
      addBoard(board);
      setBoardCount(boards.length + 1);
    } catch (err) {
      console.error('[Board] Create failed:', err);
    }
  }

  async function handleDelete(id: string) {
    removeBoard(id);
    setBoardCount(boards.length - 1);
    try {
      await boardsService.remove(id);
    } catch (err) {
      console.error('[Board] Delete failed:', err);
    }
  }

  async function handleRename(id: string, name: string) {
    updateBoard(id, { name });
    try {
      await boardsService.update(id, { name });
    } catch (err) {
      console.error('[Board] Rename failed:', err);
    }
  }

  async function handleColorChange(id: string, color: string) {
    updateBoard(id, { color });
    try {
      await boardsService.update(id, { color });
    } catch (err) {
      console.error('[Board] Color update failed:', err);
    }
  }

  // Show skeleton only on first load when we have no data
  const showSkeleton = loading && !initialized;

  return (
    <>
      <Topbar
        title="Your Boards"
        subtitle={`${boards.length} board${boards.length !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm" onClick={handleNewBoard}>
            <Plus className="w-4 h-4" />
            New Board
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {showSkeleton ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="h-40 skeleton" />
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
              <LayoutGrid className="w-8 h-8 text-white/15" />
            </div>
            <h2 className="text-lg font-semibold text-white/80 mb-2">
              No boards yet
            </h2>
            <p className="text-sm text-white/30 max-w-xs mb-6">
              Create your first board to start collecting visual inspiration.
            </p>
            <Button onClick={handleNewBoard}>
              <Plus className="w-4 h-4" />
              Create Your First Board
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {boards.map((board, i) => (
              <MemoizedBoardCard
                key={board.id}
                board={board}
                index={i}
                onDelete={handleDelete}
                onRename={handleRename}
                onColorChange={handleColorChange}
              />
            ))}
          </div>
        )}
      </div>

      <CreateBoardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="board_limit"
      />
    </>
  );
}
