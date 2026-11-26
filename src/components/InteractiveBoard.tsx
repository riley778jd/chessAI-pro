import React, { useMemo, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import type { BoardThemeId, PieceStyleId } from '../types/chess';
import { BOARD_THEMES, ChessPieceSvg } from './ChessPieces';

export interface BoardArrow {
  from: string;
  to: string;
  color?: string;
}

interface InteractiveBoardProps {
  fen: string;
  orientation?: 'w' | 'b';
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  showCoordinates?: boolean;
  interactive?: boolean;
  allowedColor?: 'w' | 'b' | 'both';
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  showEvalBar?: boolean;
  evalScore?: number; // White perspective pawns [-10, 10]
  evalLabel?: string;
  onMove?: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => boolean;
  onSquareClickCustom?: (square: Square) => void;
  editorMode?: boolean;
  onEditorDrop?: (from: Square, to: Square) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

function squareToCoords(square: string, flipped: boolean): { x: number; y: number } | null {
  if (square.length < 2) return null;
  const fileIdx = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIdx = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  if (fileIdx === -1 || rankIdx === -1) return null;
  const col = flipped ? 7 - fileIdx : fileIdx;
  const row = flipped ? 7 - rankIdx : rankIdx;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

export const InteractiveBoard: React.FC<InteractiveBoardProps> = ({
  fen,
  orientation = 'w',
  boardTheme,
  pieceStyle,
  showCoordinates = true,
  interactive = true,
  allowedColor = 'both',
  lastMove = null,
  arrows = [],
  showEvalBar = false,
  evalScore = 0,
  evalLabel = '0.0',
  onMove,
  onSquareClickCustom,
  editorMode = false,
  onEditorDrop,
}) => {
  const flipped = orientation === 'b';
  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.emerald;
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragState, setDragState] = useState<{
    from: Square;
    piece: { type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; color: 'w' | 'b' };
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: 'w' | 'b';
  } | null>(null);

  const parsedChess = useMemo(() => {
    try {
      return new Chess(fen, { skipValidation: editorMode });
    } catch {
      return new Chess();
    }
  }, [fen, editorMode]);

  const boardGrid = useMemo(() => parsedChess.board(), [parsedChess]);

  const checkSquare = useMemo(() => {
    if (editorMode) return null;
    try {
      if (!parsedChess.isCheck()) return null;
      const turn = parsedChess.turn();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = boardGrid[r][c];
          if (piece && piece.type === 'k' && piece.color === turn) {
            return piece.square;
          }
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [parsedChess, boardGrid, editorMode]);

  const legalTargets = useMemo(() => {
    const map = new Map<string, { isCapture: boolean; isPromotion: boolean }>();
    if (!selectedSquare || editorMode || !interactive) return map;
    try {
      const moves = parsedChess.moves({ square: selectedSquare, verbose: true });
      for (const m of moves) {
        map.set(m.to, {
          isCapture: m.isCapture() || Boolean(m.captured),
          isPromotion: m.isPromotion(),
        });
      }
    } catch {
      // ignore invalid
    }
    return map;
  }, [parsedChess, selectedSquare, editorMode, interactive]);

  const activeDragTargets = useMemo(() => {
    const map = new Map<string, { isCapture: boolean; isPromotion: boolean }>();
    if (!dragState || editorMode || !interactive) return map;
    try {
      const moves = parsedChess.moves({ square: dragState.from, verbose: true });
      for (const m of moves) {
        map.set(m.to, {
          isCapture: m.isCapture() || Boolean(m.captured),
          isPromotion: m.isPromotion(),
        });
      }
    } catch {
      // ignore
    }
    return map;
  }, [parsedChess, dragState, editorMode, interactive]);

  const getSquareFromPoint = (clientX: number, clientY: number): Square | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    const col = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
    const row = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
    const file = flipped ? FILES[7 - col] : FILES[col];
    const rank = flipped ? RANKS[7 - row] : RANKS[row];
    return `${file}${rank}` as Square;
  };

  const attemptMove = (from: Square, to: Square) => {
    if (from === to) return false;
    if (editorMode) {
      onEditorDrop?.(from, to);
      return true;
    }
    if (!onMove) return false;
    try {
      const moves = parsedChess.moves({ square: from, verbose: true });
      const matching = moves.filter((m) => m.to === to);
      if (matching.length === 0) return false;
      if (matching.some((m) => m.isPromotion())) {
        const piece = parsedChess.get(from);
        setPendingPromotion({ from, to, color: piece?.color || parsedChess.turn() });
        setSelectedSquare(null);
        return true;
      }
      const success = onMove(from, to);
      if (success) setSelectedSquare(null);
      return success;
    } catch {
      return false;
    }
  };

  const handleSquareClick = (sq: Square) => {
    if (!interactive) return;
    if (editorMode) {
      onSquareClickCustom?.(sq);
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      if (legalTargets.has(sq)) {
        attemptMove(selectedSquare, sq);
        return;
      }
    }

    const piece = parsedChess.get(sq);
    if (
      piece &&
      piece.color === parsedChess.turn() &&
      (allowedColor === 'both' || allowedColor === piece.color)
    ) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, sq: Square) => {
    if (!interactive) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const piece = parsedChess.get(sq);
    if (!piece) {
      return;
    }

    if (!editorMode) {
      if (piece.color !== parsedChess.turn()) return;
      if (allowedColor !== 'both' && allowedColor !== piece.color) return;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      from: sq,
      piece: { type: piece.type, color: piece.color },
      x: e.clientX,
      y: e.clientY,
      moved: false,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = Math.abs(e.clientX - dragState.x);
    const dy = Math.abs(e.clientY - dragState.y);
    if (dragState.moved || dx > 4 || dy > 4) {
      setDragState((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, moved: true } : null
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    const targetSq = getSquareFromPoint(e.clientX, e.clientY);
    if (dragState.moved && targetSq && targetSq !== dragState.from) {
      attemptMove(dragState.from, targetSq);
    } else if (!dragState.moved) {
      handleSquareClick(dragState.from);
    }
    setDragState(null);
  };

  const orderedRows = flipped ? [...RANKS].reverse() : [...RANKS];
  const orderedCols = flipped ? [...FILES].reverse() : [...FILES];

  // White percentage for eval bar (clamped 4% - 96%)
  const whitePct = Math.max(4, Math.min(96, 50 + (evalScore / 10) * 46));

  return (
    <div className="flex items-stretch gap-2.5 select-none w-full max-w-[600px] mx-auto">
      {showEvalBar && (
        <div
          className="relative w-6 sm:w-7 rounded-md overflow-hidden border border-black/15 dark:border-white/10 bg-[#1B1F24] flex flex-col shrink-0"
          aria-label={`Position evaluation ${evalLabel}`}
        >
          {flipped ? (
            <>
              <div
                className="w-full bg-[#EAECEF] transition-all duration-300 ease-out"
                style={{ height: `${whitePct}%` }}
              />
              <div className="flex-1 w-full bg-[#1B1F24]" />
            </>
          ) : (
            <>
              <div className="flex-1 w-full bg-[#1B1F24]" />
              <div
                className="w-full bg-[#EAECEF] transition-all duration-300 ease-out"
                style={{ height: `${whitePct}%` }}
              />
            </>
          )}
          <span
            className={`absolute left-0 right-0 text-center font-mono text-[10px] font-semibold leading-none px-0.5 tabular-nums ${
              evalScore >= 0
                ? flipped
                  ? 'top-1.5 text-[#121417]'
                  : 'bottom-1.5 text-[#121417]'
                : flipped
                ? 'bottom-1.5 text-[#F1F3F5]'
                : 'top-1.5 text-[#F1F3F5]'
            }`}
          >
            {evalLabel}
          </span>
        </div>
      )}

      <div
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragState(null)}
        className="relative w-full aspect-square rounded-lg overflow-hidden border border-black/20 dark:border-white/10 shadow-lg touch-none"
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {orderedRows.map((rank, rIdx) =>
            orderedCols.map((file, cIdx) => {
              const sq = `${file}${rank}` as Square;
              const fileNumeric = FILES.indexOf(file);
              const rankNumeric = Number(rank);
              const isLight = (fileNumeric + rankNumeric) % 2 === 1;

              const piece = parsedChess.get(sq);
              const isSelected = selectedSquare === sq;
              const isLastFrom = lastMove?.from === sq;
              const isLastTo = lastMove?.to === sq;
              const isCheck = checkSquare === sq;
              const targetMeta = legalTargets.get(sq) || activeDragTargets.get(sq);
              const isBeingDragged = dragState?.moved && dragState.from === sq;

              const baseColor = isLight ? theme.light : theme.dark;
              let overlayBg: string | undefined;
              if (isSelected) overlayBg = 'rgba(16, 185, 129, 0.42)';
              else if (isLastTo) overlayBg = theme.highlightTo;
              else if (isLastFrom) overlayBg = theme.highlightFrom;

              return (
                <div
                  key={sq}
                  onClick={() => {
                    if (!dragState) handleSquareClick(sq);
                  }}
                  onPointerDown={(e) => handlePointerDown(e, sq)}
                  style={{ backgroundColor: baseColor }}
                  className="relative flex items-center justify-center cursor-pointer"
                  data-square={sq}
                >
                  {overlayBg && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: overlayBg }}
                    />
                  )}

                  {isCheck && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(220,38,38,0.4) 55%, transparent 78%)',
                      }}
                    />
                  )}

                  {showCoordinates && cIdx === 0 && (
                    <span
                      className="absolute top-0.5 left-1 font-mono text-[10px] font-semibold leading-none pointer-events-none opacity-85"
                      style={{ color: isLight ? theme.coordLight : theme.coordDark }}
                    >
                      {rank}
                    </span>
                  )}
                  {showCoordinates && rIdx === 7 && (
                    <span
                      className="absolute bottom-0.5 right-1 font-mono text-[10px] font-semibold leading-none pointer-events-none opacity-85"
                      style={{ color: isLight ? theme.coordLight : theme.coordDark }}
                    >
                      {file}
                    </span>
                  )}

                  {piece && !isBeingDragged && (
                    <div className="relative z-10 w-[84%] h-[84%] transition-transform duration-100">
                      <ChessPieceSvg type={piece.type} color={piece.color} styleId={pieceStyle} />
                    </div>
                  )}

                  {targetMeta && !targetMeta.isCapture && (
                    <div className="relative z-20 w-[28%] h-[28%] rounded-full bg-black/25 pointer-events-none" />
                  )}
                  {targetMeta && targetMeta.isCapture && (
                    <div className="absolute inset-[6%] z-20 rounded-full border-[4px] border-black/28 pointer-events-none" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* SVG Engine / Tactical Arrows Overlay */}
        {arrows.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          >
            <defs>
              <marker
                id="arrow-head-emerald"
                markerWidth="4"
                markerHeight="4"
                refX="2.4"
                refY="2"
                orient="auto"
              >
                <path d="M0,0.5 L3.2,2 L0,3.5 z" fill="rgba(16, 185, 129, 0.88)" />
              </marker>
              <marker
                id="arrow-head-slate"
                markerWidth="4"
                markerHeight="4"
                refX="2.4"
                refY="2"
                orient="auto"
              >
                <path d="M0,0.5 L3.2,2 L0,3.5 z" fill="rgba(148, 163, 184, 0.72)" />
              </marker>
            </defs>
            {arrows.map((arrow, idx) => {
              const p1 = squareToCoords(arrow.from, flipped);
              const p2 = squareToCoords(arrow.to, flipped);
              if (!p1 || !p2) return null;
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy) || 1;
              const endX = p2.x - (dx / len) * 2.2;
              const endY = p2.y - (dy / len) * 2.2;
              const isPrimary = idx === 0;
              return (
                <line
                  key={`${arrow.from}-${arrow.to}-${idx}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={endX}
                  y2={endY}
                  stroke={
                    arrow.color ||
                    (isPrimary ? 'rgba(16, 185, 129, 0.85)' : 'rgba(148, 163, 184, 0.6)')
                  }
                  strokeWidth={isPrimary ? '1.85' : '1.3'}
                  strokeLinecap="round"
                  markerEnd={isPrimary ? 'url(#arrow-head-emerald)' : 'url(#arrow-head-slate)'}
                />
              );
            })}
          </svg>
        )}

        {/* Promotion Modal Overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-[#1A1D22] border border-white/15 rounded-xl p-3 shadow-2xl flex items-center gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  onClick={() => {
                    onMove?.(pendingPromotion.from, pendingPromotion.to, promo);
                    setPendingPromotion(null);
                  }}
                  className="w-12 h-12 rounded-lg bg-[#252A32] hover:bg-emerald-600/30 border border-white/10 hover:border-emerald-400/60 p-1.5 transition-colors cursor-pointer"
                  aria-label={`Promote to ${promo}`}
                >
                  <ChessPieceSvg
                    type={promo}
                    color={pendingPromotion.color}
                    styleId={pieceStyle}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPendingPromotion(null)}
                className="ml-1 px-2.5 py-2 text-xs text-neutral-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Dragged Piece */}
      {dragState?.moved && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragState.x,
            top: dragState.y,
            width: 56,
            height: 56,
            transform: 'translate(-50%, -50%) scale(1.12)',
          }}
        >
          <ChessPieceSvg
            type={dragState.piece.type}
            color={dragState.piece.color}
            styleId={pieceStyle}
          />
        </div>
      )}
    </div>
  );
};
