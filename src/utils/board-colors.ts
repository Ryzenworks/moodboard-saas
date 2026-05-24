export type BoardColor = 'cobalt' | 'violet' | 'emerald' | 'amber' | 'crimson' | 'graphite' | 'rose' | 'cyan';

export interface BoardColorConfig {
  id: BoardColor;
  label: string;
  /** Card surface — multi-stop gradient with depth */
  surface: string;
  /** Radial bloom overlay for top-center light */
  bloom: string;
  /** Bottom vignette for depth grounding */
  vignette: string;
  /** Hover glow — subtle radial */
  glow: string;
  /** Swatch dot color */
  swatch: string;
  /** Icon accent / text tint */
  text: string;
  /** Icon container background */
  iconBg: string;
  /** Raw hex for dynamic usage */
  hex: string;
}

export const BOARD_COLORS: BoardColorConfig[] = [
  {
    id: 'cobalt',
    label: 'Cobalt',
    surface: 'linear-gradient(165deg, rgba(59,130,246,0.10) 0%, rgba(30,64,175,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(59,130,246,0.08) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(59,130,246,0.06)',
    swatch: '#3b82f6',
    text: '#60a5fa',
    iconBg: 'rgba(59,130,246,0.08)',
    hex: '#3b82f6',
  },
  {
    id: 'violet',
    label: 'Violet',
    surface: 'linear-gradient(165deg, rgba(139,92,246,0.10) 0%, rgba(88,28,135,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(139,92,246,0.08) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(139,92,246,0.06)',
    swatch: '#8b5cf6',
    text: '#a78bfa',
    iconBg: 'rgba(139,92,246,0.08)',
    hex: '#8b5cf6',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    surface: 'linear-gradient(165deg, rgba(16,185,129,0.10) 0%, rgba(6,95,70,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(16,185,129,0.08) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(16,185,129,0.06)',
    swatch: '#10b981',
    text: '#34d399',
    iconBg: 'rgba(16,185,129,0.08)',
    hex: '#10b981',
  },
  {
    id: 'amber',
    label: 'Amber',
    surface: 'linear-gradient(165deg, rgba(245,158,11,0.10) 0%, rgba(146,64,14,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(245,158,11,0.07) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(245,158,11,0.06)',
    swatch: '#f59e0b',
    text: '#fbbf24',
    iconBg: 'rgba(245,158,11,0.08)',
    hex: '#f59e0b',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    surface: 'linear-gradient(165deg, rgba(239,68,68,0.10) 0%, rgba(153,27,27,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(239,68,68,0.07) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(239,68,68,0.06)',
    swatch: '#ef4444',
    text: '#f87171',
    iconBg: 'rgba(239,68,68,0.08)',
    hex: '#ef4444',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    surface: 'linear-gradient(165deg, rgba(148,163,184,0.08) 0%, rgba(51,65,85,0.05) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(148,163,184,0.05) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(148,163,184,0.04)',
    swatch: '#94a3b8',
    text: '#cbd5e1',
    iconBg: 'rgba(148,163,184,0.06)',
    hex: '#94a3b8',
  },
  {
    id: 'rose',
    label: 'Rose',
    surface: 'linear-gradient(165deg, rgba(244,114,182,0.10) 0%, rgba(157,23,77,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(244,114,182,0.07) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(244,114,182,0.06)',
    swatch: '#f472b6',
    text: '#f9a8d4',
    iconBg: 'rgba(244,114,182,0.08)',
    hex: '#f472b6',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    surface: 'linear-gradient(165deg, rgba(6,182,212,0.10) 0%, rgba(14,116,144,0.06) 40%, rgba(10,10,20,0.95) 100%)',
    bloom: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(6,182,212,0.07) 0%, transparent 70%)',
    vignette: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 70%)',
    glow: 'rgba(6,182,212,0.06)',
    swatch: '#06b6d4',
    text: '#22d3ee',
    iconBg: 'rgba(6,182,212,0.08)',
    hex: '#06b6d4',
  },
];

export function getBoardColor(colorId: string | undefined): BoardColorConfig {
  return BOARD_COLORS.find((c) => c.id === colorId) ?? BOARD_COLORS[0];
}
