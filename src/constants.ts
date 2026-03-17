import { Color } from './types';

export const COLORS: Color[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export const COLOR_MAP: Record<Color, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
};

export const BUBBLE_RADIUS = 20;
export const ROWS = 12;
export const COLS = 10;
export const CANVAS_WIDTH = COLS * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;
export const CANVAS_HEIGHT = 600;
export const PROJECTILE_SPEED = 12;
