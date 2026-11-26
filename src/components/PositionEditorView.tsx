import React, { useMemo, useState } from 'react';
import { Chess, Square, validateFen } from 'chess.js';
import { Cpu, Eraser, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { UserSettings } from '../types/chess';
import { ChessPieceSvg } from './ChessPieces';
import { InteractiveBoard } from './InteractiveBoard';

interface PositionEditorViewProps {
  settings: UserSettings;
  initialFen?: string;
  onAnalysePosition: (fen: string) => void;
  onPlayFromPosition: (fen: string) => void;
}

type SelectedBrush =
  | { type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; color: 'w' | 'b' }
  | 'erase';

const PALETTE_PIECES: { type: 'k' | 'q' | 'r' | 'b' | 'n' | 'p'; color: 'w' | 'b' }[] = [
  { color: 'w', type: 'k' },
  { color: 'w', type: 'q' },
  { color: 'w', type: 'r' },
  { color: 'w', type: 'b' },
  { color: 'w', type: 'n' },
  { color: 'w', type: 'p' },
  { color: 'b', type: 'k' },
  { color: 'b', type: 'q' },
  { color: 'b', type: 'r' },
  { color: 'b', type: 'b' },
  { color: 'b', type: 'n' },
  { color: 'b', type: 'p' },
];

export const PositionEditorView: React.FC<PositionEditorViewProps> = ({
  settings,
  initialFen,
  onAnalysePosition,
  onPlayFromPosition,
}) => {
  const [fen, setFen] = useState(
    initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [brush, setBrush] = useState<SelectedBrush>({ color: 'w', type: 'q' });
  const [fenInput, setFenInput] = useState(fen);

  const fenValidation = useMemo(() => validateFen(fen), [fen]);

  const parsedParts = useMemo(() => {
    const parts = fen.split(' ');
    return {
      placement: parts[0] || '8/8/8/8/8/8/8/8',
      turn: (parts[1] === 'b' ? 'b' : 'w') as 'w' | 'b',
      castling: parts[2] || '-',
      ep: parts[3] || '-',
      halfmove: parts[4] || '0',
      fullmove: parts[5] || '1',
    };
  }, [fen]);

  const updateFenParts = (updates: Partial<typeof parsedParts>) => {
    const next = { ...parsedParts, ...updates };
    const built = `${next.placement} ${next.turn} ${next.castling || '-'} ${next.ep || '-'} ${next.halfmove} ${next.fullmove}`;
    setFen(built);
    setFenInput(built);
  };

  const modifySquare = (mutate: (chess: Chess) => void) => {
    try {
      const chess = new Chess(fen, { skipValidation: true });
      mutate(chess);
      const updated = chess.fen({ forceEnpassantSquare: true });
      const parts = updated.split(' ');
      parts[1] = parsedParts.turn;
      parts[2] = parsedParts.castling || '-';
      parts[3] = parsedParts.ep || '-';
      const rebuilt = parts.join(' ');
      setFen(rebuilt);
      setFenInput(rebuilt);
    } catch {
      // ignore invalid
    }
  };

  const handleSquareClick = (sq: Square) => {
    modifySquare((chess) => {
      if (brush === 'erase') {
        chess.remove(sq);
      } else {
        const existing = chess.get(sq);
        if (existing && existing.type === brush.type && existing.color === brush.color) {
          chess.remove(sq);
        } else {
          chess.put(brush, sq);
        }
      }
    });
  };

  const handleEditorDrop = (from: Square, to: Square) => {
    modifySquare((chess) => {
      const p = chess.get(from);
      if (!p) return;
      chess.remove(from);
      chess.put(p, to);
    });
  };

  const toggleCastle = (flag: 'K' | 'Q' | 'k' | 'q') => {
    const current = parsedParts.castling === '-' ? '' : parsedParts.castling;
    const set = new Set(current.split('').filter(Boolean));
    if (set.has(flag)) set.delete(flag);
    else set.add(flag);
    const ordered = ['K', 'Q', 'k', 'q'].filter((f) => set.has(f)).join('') || '-';
    updateFenParts({ castling: ordered });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-6 space-y-3">
        <InteractiveBoard
          fen={fen}
          boardTheme={settings.boardTheme}
          pieceStyle={settings.pieceStyle}
          showCoordinates={settings.showCoordinates}
          editorMode={true}
          onSquareClickCustom={handleSquareClick}
          onEditorDrop={handleEditorDrop}
        />
        <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
          Select a piece from the palette and click squares to place/toggle, or drag pieces across the board.
        </p>
      </div>

      <div className="xl:col-span-6 space-y-4">
        {/* Piece Palette */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Piece Palette
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const s = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                  setFen(s);
                  setFenInput(s);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer hover:border-emerald-500/40"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start Pos
              </button>
              <button
                type="button"
                onClick={() => {
                  const emptyKings = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
                  setFen(emptyKings);
                  setFenInput(emptyKings);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer hover:border-emerald-500/40"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Board
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {PALETTE_PIECES.map((p) => {
              const active =
                brush !== 'erase' && brush.type === p.type && brush.color === p.color;
              return (
                <button
                  key={`${p.color}-${p.type}`}
                  type="button"
                  onClick={() => setBrush(p)}
                  className={`aspect-square p-2 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-600/20 border-emerald-500'
                      : 'border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] hover:border-emerald-500/40'
                  }`}
                >
                  <ChessPieceSvg type={p.type} color={p.color} styleId={settings.pieceStyle} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setBrush('erase')}
            className={`w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
              brush === 'erase'
                ? 'bg-red-500/15 border-red-500 text-red-500'
                : 'border-neutral-200 dark:border-[#2A2F38] text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" /> Erase Square Tool
          </button>
        </section>

        {/* Turn, Castling, En Passant, FEN */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Side to Move
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['w', 'b'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateFenParts({ turn: t })}
                    className={`py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      parsedParts.turn === t
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-neutral-200 dark:border-[#2A2F38] text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {t === 'w' ? 'White' : 'Black'}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span>En Passant Target</span>
              <select
                value={parsedParts.ep}
                onChange={(e) => updateFenParts({ ep: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-2.5 py-2 font-mono text-xs text-neutral-900 dark:text-neutral-100"
              >
                <option value="-">None (-)</option>
                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].flatMap((f) => [
                  <option key={`${f}3`} value={`${f}3`}>{`${f}3`}</option>,
                  <option key={`${f}6`} value={`${f}6`}>{`${f}6`}</option>,
                ])}
              </select>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Castling Rights
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(
                [
                  { flag: 'K', label: 'White O-O' },
                  { flag: 'Q', label: 'White O-O-O' },
                  { flag: 'k', label: 'Black O-O' },
                  { flag: 'q', label: 'Black O-O-O' },
                ] as const
              ).map(({ flag, label }) => {
                const checked = parsedParts.castling.includes(flag);
                return (
                  <label
                    key={flag}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCastle(flag)}
                      className="accent-emerald-500"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              FEN String
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] px-3 py-2 font-mono text-xs text-neutral-900 dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={() => setFen(fenInput.trim())}
                className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium hover:border-emerald-500/50 cursor-pointer"
              >
                Load FEN
              </button>
            </div>
            {!fenValidation.ok && (
              <p className="text-xs text-amber-500">
                FEN check: {fenValidation.error} (Ensure one White king and one Black king)
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={!fenValidation.ok}
              onClick={() => onAnalysePosition(fen)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
            >
              <Cpu className="w-4 h-4" /> Analyse Position
            </button>
            <button
              type="button"
              disabled={!fenValidation.ok}
              onClick={() => onPlayFromPosition(fen)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] disabled:opacity-40 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-emerald-500/50 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4" /> Play vs AI from Here
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
