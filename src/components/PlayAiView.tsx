import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  Flag,
  Play,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { stockfishService } from '../engine/stockfishService';
import { detectOpeningFromMoves } from '../data/openings';
import { formatClockMs } from '../utils/chessHelpers';
import { playChessSound } from '../utils/soundFx';
import type { SavedGameRecord, UserSettings } from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';
import { generateSafeId } from '../services/storageService';

interface PlayAiViewProps {
  settings: UserSettings;
  initialFen?: string;
  onSaveGame: (game: SavedGameRecord) => void;
  onReviewGame: (pgn: string) => void;
}

interface AiPreset {
  id: string;
  label: string;
  elo: number;
  skill: number;
  depth: number;
  movetime: number;
}

const AI_LEVELS: AiPreset[] = [
  { id: 'casual', label: 'Novice', elo: 800, skill: 1, depth: 3, movetime: 180 },
  { id: 'club', label: 'Club Player', elo: 1200, skill: 5, depth: 5, movetime: 280 },
  { id: 'intermediate', label: 'Intermediate', elo: 1600, skill: 10, depth: 8, movetime: 420 },
  { id: 'expert', label: 'Expert', elo: 2000, skill: 15, depth: 11, movetime: 600 },
  { id: 'master', label: 'Master', elo: 2400, skill: 18, depth: 14, movetime: 850 },
  { id: 'gm', label: 'Grandmaster', elo: 2800, skill: 20, depth: 16, movetime: 1200 },
];

const TIME_CONTROLS = [
  { id: '1+0', label: '1+0 Bullet', baseMs: 60_000, incMs: 0 },
  { id: '3+2', label: '3+2 Blitz', baseMs: 180_000, incMs: 2_000 },
  { id: '5+0', label: '5+0 Blitz', baseMs: 300_000, incMs: 0 },
  { id: '10+0', label: '10+0 Rapid', baseMs: 600_000, incMs: 0 },
  { id: '30+0', label: '30+0 Classical', baseMs: 1_800_000, incMs: 0 },
  { id: 'unlimited', label: 'Unlimited', baseMs: 0, incMs: 0 },
];

export const PlayAiView: React.FC<PlayAiViewProps> = ({
  settings,
  initialFen,
  onSaveGame,
  onReviewGame,
}) => {
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [aiLevelId, setAiLevelId] = useState<string>('intermediate');
  const [timeControlId, setTimeControlId] = useState<string>('10+0');
  const [matchMode, setMatchMode] = useState<'rated' | 'casual'>('casual');

  const [fen, setFen] = useState<string>(initialFen || new Chess().fen());
  const [startFen, setStartFen] = useState<string>(initialFen || new Chess().fen());
  const [sanMoves, setSanMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [gameResultCode, setGameResultCode] = useState<'1-0' | '0-1' | '1/2-1/2' | '*'>('*');

  const [whiteTimeMs, setWhiteTimeMs] = useState(600_000);
  const [blackTimeMs, setBlackTimeMs] = useState(600_000);

  const chessRef = useRef(new Chess(initialFen || undefined));
  const lastTickRef = useRef<number>(Date.now());

  const activePreset = AI_LEVELS.find((l) => l.id === aiLevelId) || AI_LEVELS[2];
  const activeTime = TIME_CONTROLS.find((t) => t.id === timeControlId) || TIME_CONTROLS[3];

  useEffect(() => {
    if (initialFen) {
      startNewGame(playerColor, initialFen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFen]);

  const opening = useMemo(() => detectOpeningFromMoves(sanMoves), [sanMoves]);

  // Clock interval
  useEffect(() => {
    if (!gameActive || activeTime.baseMs === 0) return;
    lastTickRef.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTimeMs((prev) => {
          const next = Math.max(0, prev - dt);
          if (next === 0) finishGame('0-1', 'Black wins on time');
          return next;
        });
      } else {
        setBlackTimeMs((prev) => {
          const next = Math.max(0, prev - dt);
          if (next === 0) finishGame('1-0', 'White wins on time');
          return next;
        });
      }
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive, activeTime.baseMs]);

  const buildPgn = (resultCode: '1-0' | '0-1' | '1/2-1/2' | '*') => {
    const c = new Chess(startFen);
    for (const san of sanMoves) {
      try {
        c.move(san);
      } catch {
        break;
      }
    }
    c.setHeader('Event', matchMode === 'rated' ? 'ChessAI Pro Rated Match' : 'ChessAI Pro Practice');
    c.setHeader('White', playerColor === 'w' ? 'Player' : `Stockfish (${activePreset.elo})`);
    c.setHeader('Black', playerColor === 'b' ? 'Player' : `Stockfish (${activePreset.elo})`);
    c.setHeader('Result', resultCode);
    c.setHeader('ECO', opening.eco);
    return c.pgn();
  };

  const finishGame = (code: '1-0' | '0-1' | '1/2-1/2', message: string, movesSnapshot?: string[]) => {
    setGameActive(false);
    setAiThinking(false);
    setResultText(message);
    setGameResultCode(code);
    playChessSound('gameover', settings.soundEnabled);

    const usedMoves = movesSnapshot || sanMoves;
    const c = new Chess(startFen);
    for (const san of usedMoves) {
      try {
        c.move(san);
      } catch {
        break;
      }
    }
    c.setHeader('Event', matchMode === 'rated' ? 'ChessAI Pro Rated Match' : 'ChessAI Pro Practice');
    c.setHeader('White', playerColor === 'w' ? 'Player' : `Stockfish (${activePreset.elo})`);
    c.setHeader('Black', playerColor === 'b' ? 'Player' : `Stockfish (${activePreset.elo})`);
    c.setHeader('Result', code);

    const openInfo = detectOpeningFromMoves(usedMoves);
    onSaveGame({
      id: generateSafeId('ai_game'),
      title: `vs Stockfish ${activePreset.elo} · ${openInfo.name}`,
      white: playerColor === 'w' ? 'Player' : `Stockfish (${activePreset.elo})`,
      black: playerColor === 'b' ? 'Player' : `Stockfish (${activePreset.elo})`,
      result: code,
      eco: openInfo.eco,
      openingName: openInfo.name,
      pgn: c.pgn(),
      initialFen: startFen,
      mode: 'ai_game',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    });
  };

  const triggerAiTurn = async (currentMoves: string[]) => {
    const c = chessRef.current;
    if (c.isGameOver()) return;
    setAiThinking(true);
    try {
      const { bestMove } = await stockfishService.evaluateSinglePosition(c.fen(), {
        skillLevel: activePreset.skill,
        depth: activePreset.depth,
        movetime: activePreset.movetime,
      });
      if (!bestMove || chessRef.current.fen() !== c.fen()) {
        setAiThinking(false);
        return;
      }
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length > 4 ? (bestMove[4] as 'q' | 'r' | 'b' | 'n') : undefined;
      const move = chessRef.current.move({ from, to, promotion: promotion || 'q' });
      if (!move) {
        setAiThinking(false);
        return;
      }

      if (activeTime.incMs > 0) {
        if (move.color === 'w') setWhiteTimeMs((t) => t + activeTime.incMs);
        else setBlackTimeMs((t) => t + activeTime.incMs);
      }

      const updatedMoves = [...currentMoves, move.san];
      setFen(chessRef.current.fen());
      setSanMoves(updatedMoves);
      setLastMove({ from: move.from, to: move.to });

      if (chessRef.current.isCheckmate()) {
        const winner = chessRef.current.turn() === 'w' ? '0-1' : '1-0';
        finishGame(
          winner,
          `Checkmate · ${winner === '1-0' ? 'White' : 'Black'} wins`,
          updatedMoves
        );
      } else if (chessRef.current.isDraw()) {
        finishGame('1/2-1/2', 'Game drawn', updatedMoves);
      } else if (chessRef.current.isCheck()) {
        playChessSound('check', settings.soundEnabled);
      } else if (move.isCapture()) {
        playChessSound('capture', settings.soundEnabled);
      } else {
        playChessSound('move', settings.soundEnabled);
      }
    } catch (err) {
      console.error('AI move failed:', err);
    } finally {
      setAiThinking(false);
    }
  };

  const startNewGame = (side: 'w' | 'b' = playerColor, customFen?: string) => {
    stockfishService.stopCurrent();
    const baseFen = customFen || new Chess().fen();
    const fresh = new Chess(baseFen);
    chessRef.current = fresh;
    setStartFen(fresh.fen());
    setFen(fresh.fen());
    setSanMoves([]);
    setLastMove(null);
    setResultText(null);
    setGameResultCode('*');
    setWhiteTimeMs(activeTime.baseMs);
    setBlackTimeMs(activeTime.baseMs);
    setGameActive(true);
    setAiThinking(false);

    if (fresh.turn() !== side) {
      setTimeout(() => triggerAiTurn([]), 250);
    }
  };

  const handlePlayerMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (!gameActive || aiThinking) return false;
    if (chessRef.current.turn() !== playerColor) return false;
    try {
      const move = chessRef.current.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;

      if (activeTime.incMs > 0) {
        if (move.color === 'w') setWhiteTimeMs((t) => t + activeTime.incMs);
        else setBlackTimeMs((t) => t + activeTime.incMs);
      }

      const updatedMoves = [...sanMoves, move.san];
      setFen(chessRef.current.fen());
      setSanMoves(updatedMoves);
      setLastMove({ from: move.from, to: move.to });

      if (chessRef.current.isCheckmate()) {
        const winner = chessRef.current.turn() === 'w' ? '0-1' : '1-0';
        finishGame(
          winner,
          `Checkmate · ${winner === '1-0' ? 'White' : 'Black'} wins`,
          updatedMoves
        );
        return true;
      }
      if (chessRef.current.isDraw()) {
        finishGame('1/2-1/2', 'Game drawn', updatedMoves);
        return true;
      }

      if (chessRef.current.isCheck()) {
        playChessSound('check', settings.soundEnabled);
      } else if (move.isCapture()) {
        playChessSound('capture', settings.soundEnabled);
      } else {
        playChessSound('move', settings.soundEnabled);
      }

      setTimeout(() => triggerAiTurn(updatedMoves), 220);
      return true;
    } catch {
      playChessSound('illegal', settings.soundEnabled);
      return false;
    }
  };

  const handleTakeback = () => {
    if (!gameActive || matchMode === 'rated' || aiThinking || sanMoves.length < 2) return;
    chessRef.current.undo();
    chessRef.current.undo();
    const updatedMoves = sanMoves.slice(0, -2);
    setFen(chessRef.current.fen());
    setSanMoves(updatedMoves);
    setLastMove(null);
  };

  const topClock = playerColor === 'w' ? blackTimeMs : whiteTimeMs;
  const bottomClock = playerColor === 'w' ? whiteTimeMs : blackTimeMs;
  const isTopTurn = gameActive && chessRef.current.turn() !== playerColor;
  const isBottomTurn = gameActive && chessRef.current.turn() === playerColor;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-7 space-y-3">
        {/* Opponent Info + Clock */}
        <div className="max-w-[600px] mx-auto flex items-center justify-between px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22]">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Stockfish 19 · {activePreset.label} ({activePreset.elo})
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {aiThinking ? 'Calculating move...' : playerColor === 'w' ? 'Playing Black' : 'Playing White'}
            </p>
          </div>
          {activeTime.baseMs > 0 && (
            <div
              className={`px-3 py-1.5 rounded-lg font-mono text-base font-semibold tabular-nums ${
                isTopTurn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 dark:bg-[#121417] text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {formatClockMs(topClock)}
            </div>
          )}
        </div>

        <InteractiveBoard
          fen={fen}
          orientation={playerColor}
          boardTheme={settings.boardTheme}
          pieceStyle={settings.pieceStyle}
          showCoordinates={settings.showCoordinates}
          interactive={gameActive && !aiThinking}
          allowedColor={playerColor}
          lastMove={lastMove}
          onMove={handlePlayerMove}
        />

        {/* Player Info + Clock */}
        <div className="max-w-[600px] mx-auto flex items-center justify-between px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22]">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              You ({playerColor === 'w' ? 'White' : 'Black'})
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {opening.eco} · {opening.name}
            </p>
          </div>
          {activeTime.baseMs > 0 && (
            <div
              className={`px-3 py-1.5 rounded-lg font-mono text-base font-semibold tabular-nums ${
                isBottomTurn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 dark:bg-[#121417] text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {formatClockMs(bottomClock)}
            </div>
          )}
        </div>
      </div>

      {/* Right: Match Setup & Controls */}
      <div className="xl:col-span-5 space-y-4">
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Match Configuration
          </h3>

          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Play As</span>
            <div className="grid grid-cols-2 gap-2">
              {(['w', 'b'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setPlayerColor(side)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    playerColor === side
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-neutral-200 dark:border-[#2A2F38] text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/40'
                  }`}
                >
                  {side === 'w' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Engine Strength
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AI_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setAiLevelId(lvl.id)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    aiLevelId === lvl.id
                      ? 'bg-emerald-600/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-neutral-200 dark:border-[#2A2F38] text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{lvl.label}</div>
                  <div className="text-[11px] font-mono opacity-75 tabular-nums">{lvl.elo} Elo</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Time Control</span>
              <select
                value={timeControlId}
                onChange={(e) => setTimeControlId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-2.5 py-2 text-xs text-neutral-900 dark:text-neutral-100"
              >
                {TIME_CONTROLS.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Match Type</span>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417]">
                {(['casual', 'rated'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMatchMode(m)}
                    className={`py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer ${
                      matchMode === m
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => startNewGame(playerColor)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer transition-colors whitespace-nowrap"
            >
              {gameActive ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {gameActive ? 'Restart Match' : 'Start Match'}
            </button>

            {gameActive && matchMode === 'casual' && (
              <button
                type="button"
                onClick={handleTakeback}
                disabled={sanMoves.length < 2 || aiThinking}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" /> Takeback
              </button>
            )}

            {gameActive && (
              <button
                type="button"
                onClick={() =>
                  finishGame(
                    playerColor === 'w' ? '0-1' : '1-0',
                    `${playerColor === 'w' ? 'White' : 'Black'} resigned`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-medium cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" /> Resign
              </button>
            )}
          </div>
        </section>

        {resultText && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Game Finished · {resultText}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Saved automatically to your Saved Games library.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onReviewGame(buildPgn(gameResultCode))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Review This Game with Stockfish
            </button>
          </section>
        )}

        {/* Move List */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Match Notation
          </h3>
          <div className="max-h-48 overflow-y-auto font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {sanMoves.length === 0 ? (
              <span className="text-neutral-500">Click Start Match to begin playing.</span>
            ) : (
              sanMoves.map((san, idx) => (
                <span key={idx} className="inline-block mr-2">
                  {idx % 2 === 0 && (
                    <span className="text-neutral-400 mr-1">{idx / 2 + 1}.</span>
                  )}
                  <span>{san}</span>
                </span>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
