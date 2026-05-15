export type BoardColor = 'cobalt' | 'violet' | 'emerald' | 'amber' | 'crimson' | 'graphite' | 'rose' | 'cyan';

export interface BoardColorConfig {
  id: BoardColor;
  label: string;
  // Card surface gradient
  surface: string;
  // Lighter tint for hover glow
  glow: string;
  // Swatch dot color
  swatch: string;
  // Text accent
  text: string;
  // CSS hex for dynamic usage
  hex: string;
}

export const BOARD_COLORS: BoardColorConfig[] = [
  {
    id: 'cobalt',
    label: 'Cobalt',
    surface: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.04) 100%)',
    glow: 'rgba(59,130,246,0.08)',
    swatch: '#3b82f6',
    text: '#60a5fa',
    hex: '#3b82f6',
  },
  {
    id: 'violet',
    label: 'Violet',
    surface: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.04) 100%)',
    glow: 'rgba(139,92,246,0.08)',
    swatch: '#8b5cf6',
    text: '#a78bfa',
    hex: '#8b5cf6',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    surface: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.04) 100%)',
    glow: 'rgba(16,185,129,0.08)',
    swatch: '#10b981',
    text: '#34d399',
    hex: '#10b981',
  },
  {
    id: 'amber',
    label: 'Amber',
    surface: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.04) 100%)',
    glow: 'rgba(245,158,11,0.08)',
    swatch: '#f59e0b',
    text: '#fbbf24',
    hex: '#f59e0b',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    surface: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.04) 100%)',
    glow: 'rgba(239,68,68,0.08)',
    swatch: '#ef4444',
    text: '#f87171',
    hex: '#ef4444',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    surface: 'linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(100,116,139,0.04) 100%)',
    glow: 'rgba(148,163,184,0.06)',
    swatch: '#94a3b8',
    text: '#cbd5e1',
    hex: '#94a3b8',
  },
  {
    id: 'rose',
    label: 'Rose',
    surface: 'linear-gradient(135deg, rgba(244,114,182,0.12) 0%, rgba(236,72,153,0.04) 100%)',
    glow: 'rgba(244,114,182,0.08)',
    swatch: '#f472b6',
    text: '#f9a8d4',
    hex: '#f472b6',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    surface: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(8,145,178,0.04) 100%)',
    glow: 'rgba(6,182,212,0.08)',
    swatch: '#06b6d4',
    text: '#22d3ee',
    hex: '#06b6d4',
  },
];

export function getBoardColor(colorId: string | undefined): BoardColorConfig {
  return BOARD_COLORS.find((c) => c.id === colorId) ?? BOARD_COLORS[0];
}
