import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Color, Bubble, Projectile } from '../types';
import { COLORS, COLOR_MAP, BUBBLE_RADIUS, ROWS, COLS, CANVAS_WIDTH, CANVAS_HEIGHT, PROJECTILE_SPEED } from '../constants';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextColor, setNextColor] = useState<Color>(COLORS[Math.floor(Math.random() * COLORS.length)]);
  
  const gridRef = useRef<(Bubble | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const projectileRef = useRef<Projectile | null>(null);
  const mousePos = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT });

  // Initialize grid with some bubbles
  useEffect(() => {
    const initialRows = 5;
    for (let r = 0; r < initialRows; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = getBubbleX(r, c);
        const y = getBubbleY(r);
        gridRef.current[r][c] = {
          x,
          y,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          row: r,
          col: c
        };
      }
    }
  }, []);

  function getBubbleX(row: number, col: number) {
    let x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;
    if (row % 2 === 1) {
      x += BUBBLE_RADIUS;
    }
    return x;
  }

  function getBubbleY(row: number) {
    return row * BUBBLE_RADIUS * 1.732 + BUBBLE_RADIUS;
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    mousePos.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleShoot = () => {
    if (projectileRef.current || gameOver) return;

    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 40;
    const dx = mousePos.current.x - startX;
    const dy = mousePos.current.y - startY;
    const angle = Math.atan2(dy, dx);

    projectileRef.current = {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * PROJECTILE_SPEED,
      vy: Math.sin(angle) * PROJECTILE_SPEED,
      color: nextColor
    };

    setNextColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  };

  const snapToGrid = (x: number, y: number, color: Color) => {
    let bestDist = Infinity;
    let bestRow = -1;
    let bestCol = -1;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (gridRef.current[r][c]) continue;
        const gx = getBubbleX(r, c);
        const gy = getBubbleY(r);
        const dist = Math.sqrt((x - gx) ** 2 + (y - gy) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestRow = r;
          bestCol = c;
        }
      }
    }

    if (bestRow !== -1) {
      gridRef.current[bestRow][bestCol] = {
        x: getBubbleX(bestRow, bestCol),
        y: getBubbleY(bestRow),
        color,
        row: bestRow,
        col: bestCol
      };
      
      handleMatches(bestRow, bestCol);
      
      if (bestRow >= ROWS - 1) {
        setGameOver(true);
      }
    }
  };

  const getNeighbors = (row: number, col: number) => {
    const neighbors: { r: number; c: number }[] = [];
    const oddRow = row % 2 === 1;
    
    const offsets = oddRow 
      ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];

    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        neighbors.push({ r: nr, c: nc });
      }
    }
    return neighbors;
  };

  const handleMatches = (row: number, col: number) => {
    const bubble = gridRef.current[row][col];
    if (!bubble) return;

    const color = bubble.color;
    const matches: { r: number; c: number }[] = [{ r: row, c: col }];
    const visited = new Set<string>();
    visited.add(`${row},${col}`);

    let i = 0;
    while (i < matches.length) {
      const curr = matches[i++];
      const neighbors = getNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        const nb = gridRef.current[n.r][n.c];
        if (nb && nb.color === color && !visited.has(`${n.r},${n.c}`)) {
          visited.add(`${n.r},${n.c}`);
          matches.push(n);
        }
      }
    }

    if (matches.length >= 3) {
      for (const m of matches) {
        gridRef.current[m.r][m.c] = null;
      }
      setScore(s => s + matches.length * 10);
      removeFloatingBubbles();
    }
  };

  const removeFloatingBubbles = () => {
    const connectedToTop = new Set<string>();
    const queue: { r: number; c: number }[] = [];

    // Start from top row
    for (let c = 0; c < COLS; c++) {
      if (gridRef.current[0][c]) {
        connectedToTop.add(`0,${c}`);
        queue.push({ r: 0, c: c });
      }
    }

    let i = 0;
    while (i < queue.length) {
      const curr = queue[i++];
      const neighbors = getNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        if (gridRef.current[n.r][n.c] && !connectedToTop.has(`${n.r},${n.c}`)) {
          connectedToTop.add(`${n.r},${n.c}`);
          queue.push(n);
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (gridRef.current[r][c] && !connectedToTop.has(`${r},${c}`)) {
          gridRef.current[r][c] = null;
          setScore(s => s + 5);
        }
      }
    }
  };

  const update = useCallback(() => {
    if (gameOver) return;

    if (projectileRef.current) {
      const p = projectileRef.current;
      p.x += p.vx;
      p.y += p.vy;

      // Wall bounce
      if (p.x < BUBBLE_RADIUS || p.x > CANVAS_WIDTH - BUBBLE_RADIUS) {
        p.vx *= -1;
      }

      // Top hit
      if (p.y < BUBBLE_RADIUS) {
        snapToGrid(p.x, p.y, p.color);
        projectileRef.current = null;
        return;
      }

      // Bubble collision
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const b = gridRef.current[r][c];
          if (b) {
            const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
            if (dist < BUBBLE_RADIUS * 2 - 2) {
              snapToGrid(p.x, p.y, p.color);
              projectileRef.current = null;
              return;
            }
          }
        }
      }

      // Out of bounds
      if (p.y > CANVAS_HEIGHT) {
        projectileRef.current = null;
      }
    }
  }, [gameOver]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = gridRef.current[r][c];
        if (b) {
          drawBubble(ctx, b.x, b.y, b.color);
        }
      }
    }

    // Draw projectile
    if (projectileRef.current) {
      drawBubble(ctx, projectileRef.current.x, projectileRef.current.y, projectileRef.current.color);
    }

    // Draw launcher
    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 40;
    const dx = mousePos.current.x - startX;
    const dy = mousePos.current.y - startY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(angle);
    
    // Launcher arrow
    ctx.beginPath();
    ctx.moveTo(BUBBLE_RADIUS + 5, 0);
    ctx.lineTo(BUBBLE_RADIUS + 40, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(BUBBLE_RADIUS + 40, 0);
    ctx.lineTo(BUBBLE_RADIUS + 35, -5);
    ctx.lineTo(BUBBLE_RADIUS + 35, 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    // Next bubble preview in launcher
    drawBubble(ctx, 0, 0, nextColor);
    ctx.restore();

  }, [nextColor]);

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: Color) => {
    const hexColor = COLOR_MAP[color];
    
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(
      x - BUBBLE_RADIUS * 0.3, 
      y - BUBBLE_RADIUS * 0.3, 
      BUBBLE_RADIUS * 0.1, 
      x, y, BUBBLE_RADIUS
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, hexColor);
    gradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Shine
    ctx.beginPath();
    ctx.arc(x - BUBBLE_RADIUS * 0.3, y - BUBBLE_RADIUS * 0.3, BUBBLE_RADIUS * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      update();
      draw(ctx);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [update, draw]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-4 font-sans">
      <div className="w-full max-w-md mb-6 flex justify-between items-end backdrop-blur-md bg-white/5 p-6 rounded-2xl border border-white/10 shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            BAUBLE BLAST
          </h1>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Minimalist Shooter</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-light tracking-tight">{score.toString().padStart(6, '0')}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Score</div>
        </div>
      </div>

      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onClick={handleShoot}
          className="bg-black/40 rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-crosshair touch-none"
        />
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-xl bg-black/60 rounded-3xl animate-in fade-in duration-500">
            <h2 className="text-5xl font-bold mb-2 tracking-tighter">GAME OVER</h2>
            <p className="text-white/60 mb-8 font-mono">Final Score: {score}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-emerald-400 transition-colors duration-300"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-8 text-white/20 uppercase text-[10px] tracking-[0.2em] font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          Aim with Mouse
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          Click to Shoot
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          Match 3+
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
