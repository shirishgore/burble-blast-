export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Bubble {
  x: number;
  y: number;
  color: Color;
  row: number;
  col: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: Color;
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  nextColor: Color;
}
