import { create } from 'zustand';
import type { Board } from '@/types';

interface BoardsState {
  boards: Board[];
  loading: boolean;
  /** True after first successful fetch — prevents skeleton on subsequent visits */
  initialized: boolean;
  setBoards: (boards: Board[]) => void;
  addBoard: (board: Board) => void;
  updateBoard: (id: string, updates: Partial<Board>) => void;
  removeBoard: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useBoardsStore = create<BoardsState>((set) => ({
  boards: [],
  loading: false,
  initialized: false,
  setBoards: (boards) => set({ boards, loading: false, initialized: true }),
  addBoard: (board) =>
    set((s) => ({ boards: [board, ...s.boards] })),
  updateBoard: (id, updates) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBoard: (id) =>
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
