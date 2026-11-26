import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  ArrowLeftRight,
  BookmarkPlus,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { stockfishService } from '../engine/stockfishService';
import { detectOpeningFromMoves } from '../data/openings';
import { computeMaterialBalance, detectGamePhase } from '../utils/chessHelpers';
import { playChessSound } from '../utils/soundFx';
import type {
  AnalysisHistoryRecord,
  EngineLine,
  SavedGameRecord,
  UserSettings,
} from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';
import { generateSafeId } from '../services/storageService';

interface AnalysisViewProps {
  settings: UserSettings;
  initialFen?: string;
  initialPgn?: string;
  onSaveGame: (game: SavedGameRecord) => void;
  onSaveAnalysis: (record: AnalysisHistoryRecord) => void;
  onSendToCoach: (fen: string, lines: EngineLine[]) => void;
  onSendToEditor: (fen: string) => void;
  onSendToReview: (pgn: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  settings,
  initialFen,
  initialPgn,
  onSaveGame,
  onSaveAnalysis,
  onSendToCoach,
  onSendToEditor,
  onSendToReview,
}) => {
  const [fenHistory, setFenHistory] = useState<string[]>([
    initialFen || new Chess().fen(),
  ]);
  const [sanHistory, setSanHistory] = useState<string[]>([]);
  const [moveSquares, setMoveSquares] = useState<({ from: string; to: string } | null)[]>([
    null,
  ]);
  const [cursor, setCursor] = useState(0);
  const [redoStack, setRedoStack] = useState<{ fen: string; san: string; squares: { from: string; to: string } }[]>([]);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');

  const [isAnalyzing, setIsAnalyzing] = useState(settings.autoAnalyze);
  const [depth, setDepth] = useState(settings.engineDepth);
  const [multiPv, setMultiPv] = useState(settings.multiPv);
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [engineSearching, setEngineSearching] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  const [coachAnswer, setCoachAnswer] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialPgn) {
      loadPgnText(initialPgn);
    } else if (initialFen) {
      loadFenText(initialFen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFen, initialPgn]);

  const currentFen = fenHistory[cursor] || fenHistory[0];

  const chessState = useMemo(() => {
    try {
      return new Chess(currentFen);
    } catch {
      return new Chess();
    }
  }, [currentFen]);

  const material = useMemo(() => computeMaterialBalance(currentFen), [currentFen]);
  const gamePhase = useMemo(() => detectGamePhase(currentFen), [currentFen]);
  const opening = useMemo(() => detectOpeningFromMoves(sanHistory.slice(0, cursor)), [sanHistory, cursor]);

  const gameStatusText = useMemo(() => {
    if (chessState.isCheckmate()) {
      return `Checkmate · ${chessState.turn() === 'w' ? 'Black' : 'White'} wins`;
    }
    if (chessState.isStalemate()) return 'Draw by Stalemate';
    if (chessState.isInsufficientMaterial()) return 'Draw · Insufficient Material';
    if (chessState.isThreefoldRepetition()) return 'Draw · Threefold Repetition';
    if (chessState.isCheck()) return `${chessState.turn() === 'w' ? 'White' : 'Black'} in Check`;
    return `${chessState.turn() === 'w' ? 'White' : 'Black'} to move`;
  }, [chessState]);

  useEffect(() => {
    if (!isAnalyzing || chessState.isGameOver()) {
      stockfishService.stopCurrent();
      setEngineSearching(false);
      if (chessState.isGameOver()) setEngineLines([]);
      return;
    }

    setEngineSearching(true);
    setEngineError(null);
    const cancel = stockfishService.analyzePosition(
      currentFen,
      { depth, multiPv, hashMb: settings.engineHashMb },
      (lines, _bestMove, done) => {
        setEngineLines(lines);
        if (done) setEngineSearching(false);
      }
    );

    return () => {
      cancel();
    };
  }, [currentFen, isAnalyzing, depth, multiPv, settings.engineHashMb, chessState]);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    try {
      const next = new Chess(currentFen);
      const move = next.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;

      if (next.isCheckmate() || next.isDraw()) {
        playChessSound('gameover', settings.soundEnabled);
      } else if (next.isCheck()) {
        playChessSound('check', settings.soundEnabled);
      } else if (move.isKingsideCastle() || move.isQueensideCastle()) {
        playChessSound('castle', settings.soundEnabled);
      } else if (move.isCapture()) {
        playChessSound('capture', settings.soundEnabled);
      } else {
        playChessSound('move', settings.soundEnabled);
      }

      const nextFens = [...fenHistory.slice(0, cursor + 1), next.fen()];
      const nextSans = [...sanHistory.slice(0, cursor), move.san];
      const nextSquares = [...moveSquares.slice(0, cursor + 1), { from: move.from, to: move.to }];

      setFenHistory(nextFens);
      setSanHistory(nextSans);
      setMoveSquares(nextSquares);
      setCursor(nextFens.length - 1);
      setRedoStack([]);
      setCoachAnswer(null);
      return true;
    } catch {
      playChessSound('illegal', settings.soundEnabled);
      return false;
    }
  };

  const handlePlayEngineMove = (uci: string) => {
    if (!uci || uci.length < 4) return;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined;
    handleMove(from, to, promo);
  };

  const handleReset = () => {
    const startFen = new Chess().fen();
    setFenHistory([startFen]);
    setSanHistory([]);
    setMoveSquares([null]);
    setCursor(0);
    setRedoStack([]);
    setCoachAnswer(null);
  };

  const handleUndo = () => {
    if (cursor > 0) {
      const removedFen = fenHistory[cursor];
      const removedSan = sanHistory[cursor - 1];
      const removedSq = moveSquares[cursor];
      if (removedFen && removedSan && removedSq) {
        setRedoStack((prev) => [{ fen: removedFen, san: removedSan, squares: removedSq }, ...prev]);
      }
      setCursor((c) => c - 1);
    }
  };

  const handleRedo = () => {
    if (cursor < fenHistory.length - 1) {
      setCursor((c) => c + 1);
    } else if (redoStack.length > 0) {
      const [first, ...rest] = redoStack;
      setFenHistory((prev) => [...prev, first.fen]);
      setSanHistory((prev) => [...prev, first.san]);
      setMoveSquares((prev) => [...prev, first.squares]);
      setCursor(fenHistory.length);
      setRedoStack(rest);
    }
  };

  const loadFenText = (raw: string): boolean => {
    try {
      const c = new Chess(raw.trim());
      setFenHistory([c.fen()]);
      setSanHistory([]);
      setMoveSquares([null]);
      setCursor(0);
      setRedoStack([]);
      setCoachAnswer(null);
      setImportError(null);
      setShowImportModal(false);
      return true;
    } catch {
      setImportError('Invalid FEN string.');
      return false;
    }
  };

  const loadPgnText = (raw: string): boolean => {
    try {
      const c = new Chess();
      c.loadPgn(raw.trim());
      const moves = c.history({ verbose: true });
      const replay = new Chess();
      const fens = [replay.fen()];
      const sans: string[] = [];
      const squares: ({ from: string; to: string } | null)[] = [null];
      for (const m of moves) {
        replay.move(m.san);
        fens.push(replay.fen());
        sans.push(m.san);
        squares.push({ from: m.from, to: m.to });
      }
      setFenHistory(fens);
      setSanHistory(sans);
      setMoveSquares(squares);
      setCursor(fens.length - 1);
      setRedoStack([]);
      setCoachAnswer(null);
      setImportError(null);
      setShowImportModal(false);
      return true;
    } catch {
      setImportError('Unable to parse PGN or FEN. Verify standard algebraic notation.');
      return false;
    }
  };

  const handleImportSubmit = () => {
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError('Paste a FEN or PGN first.');
      return;
    }
    if (trimmed.split('/').length === 8 && !trimmed.includes('1.')) {
      loadFenText(trimmed);
    } else {
      loadPgnText(trimmed);
    }
  };

  const buildPgnString = () => {
    const c = new Chess(fenHistory[0]);
    for (let i = 0; i < sanHistory.length; i++) {
      c.move(sanHistory[i]);
    }
    c.setHeader('Event', 'ChessAI Pro Analysis');
    c.setHeader('ECO', opening.eco);
    c.setHeader('Opening', opening.name);
    return c.pgn();
  };

  const handleAskQuickCoach = async () => {
    if (engineLines.length === 0) {
      setCoachError('Let Stockfish evaluate at least 1 line before asking the AI Coach.');
      return;
    }
    setCoachLoading(true);
    setCoachError(null);
    try {
      const resp = await fetch('/api/coach/explain-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: currentFen,
          turn: chessState.turn(),
          stockfishLines: engineLines,
          materialSummary: material.summary,
          lastMoveSan: cursor > 0 ? sanHistory[cursor - 1] : '',
          gamePhase,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to get coaching explanation.');
      }
      setCoachAnswer(data.answer);
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Unable to reach AI Coach.');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleSaveSnapshot = () => {
    const top = engineLines[0];
    const record: AnalysisHistoryRecord = {
      id: generateSafeId('analysis'),
      fen: currentFen,
      depth: top?.depth || depth,
      bestMove: top?.pvSan[0] || top?.pvUci[0] || 'N/A',
      evalDisplay: top?.evalLabel || '0.00',
      topLines: engineLines.map((l) => `${l.evalLabel} · ${l.pvSan.slice(0, 6).join(' ')}`),
      coachSummary: coachAnswer || `${opening.eco} ${opening.name} · ${material.summary}`,
      createdAtMs: Date.now(),
    };
    onSaveAnalysis(record);

    const game: SavedGameRecord = {
      id: generateSafeId('game'),
      title: `${opening.name} (${sanHistory.length} plies)`,
      white: 'Analysis White',
      black: 'Analysis Black',
      result: '*',
      eco: opening.eco,
      openingName: opening.name,
      pgn: buildPgnString(),
      initialFen: fenHistory[0],
      mode: 'analysis',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    onSaveGame(game);
    notify('Saved position analysis & PGN to library.');
  };

  const boardArrows = useMemo(() => {
    return engineLines
      .slice(0, 2)
      .map((line) => {
        const uci = line.pvUci[0];
        if (!uci || uci.length < 4) return null;
        return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
      })
      .filter((a): a is { from: string; to: string } => Boolean(a));
  }, [engineLines]);

  const movePairs = useMemo(() => {
    const pairs: { num: number; white?: { san: string; ply: number }; black?: { san: string; ply: number } }[] = [];
    for (let i = 0; i < sanHistory.length; i += 2) {
      pairs.push({
        num: i / 2 + 1,
        white: { san: sanHistory[i], ply: i + 1 },
        black: sanHistory[i + 1] ? { san: sanHistory[i + 1], ply: i + 2 } : undefined,
      });
    }
    return pairs;
  }, [sanHistory]);

  const topLine = engineLines[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Board + Navigation + Material */}
      <div className="xl:col-span-7 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {opening.eco} · {opening.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {gamePhase} · {gameStatusText}
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums whitespace-nowrap">
            {material.summary}
          </div>
        </div>

        <InteractiveBoard
          fen={currentFen}
          orientation={orientation}
          boardTheme={settings.boardTheme}
          pieceStyle={settings.pieceStyle}
          showCoordinates={settings.showCoordinates}
          lastMove={moveSquares[cursor]}
          arrows={isAnalyzing ? boardArrows : []}
          showEvalBar={settings.showEvalBar}
          evalScore={topLine?.normalizedScore ?? 0}
          evalLabel={topLine?.evalLabel ?? '0.0'}
          onMove={handleMove}
        />

        {/* Board Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 max-w-[600px] mx-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCursor(0)}
              disabled={cursor === 0}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-neutral-700 dark:text-neutral-200 disabled:opacity-40 hover:border-emerald-500/50 transition-colors cursor-pointer"
              aria-label="First move"
            >
              <ChevronFirst className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={cursor === 0}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-neutral-700 dark:text-neutral-200 disabled:opacity-40 hover:border-emerald-500/50 transition-colors cursor-pointer"
              aria-label="Previous move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={cursor >= fenHistory.length - 1 && redoStack.length === 0}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-neutral-700 dark:text-neutral-200 disabled:opacity-40 hover:border-emerald-500/50 transition-colors cursor-pointer"
              aria-label="Next move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(fenHistory.length - 1)}
              disabled={cursor >= fenHistory.length - 1}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-neutral-700 dark:text-neutral-200 disabled:opacity-40 hover:border-emerald-500/50 transition-colors cursor-pointer"
              aria-label="Last move"
            >
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Flip
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setImportText('');
                setImportError(null);
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </div>

      {/* Right: Stockfish UCI Engine + Move List + AI Coach */}
      <div className="xl:col-span-5 space-y-4">
        {/* Stockfish 19 Engine Panel */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Stockfish 19 UCI Engine
              </h3>
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                {topLine
                  ? `Depth ${topLine.depth}/${topLine.seldepth} · ${(topLine.nodes / 1000).toFixed(1)}k nodes · ${(topLine.nps / 1000).toFixed(0)}k nps`
                  : engineSearching
                  ? 'Calculating UCI lines...'
                  : 'Engine paused'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnalyzing((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isAnalyzing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'border border-neutral-200 dark:border-[#2A2F38] text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50'
              }`}
            >
              {isAnalyzing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isAnalyzing ? 'Pause' : 'Analyse'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="text-xs text-neutral-600 dark:text-neutral-400 flex flex-col gap-1">
              <span className="flex justify-between font-mono tabular-nums">
                <span>Search Depth</span>
                <span>{depth}</span>
              </span>
              <input
                type="range"
                min={6}
                max={22}
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="accent-emerald-500 cursor-pointer"
              />
            </label>
            <label className="text-xs text-neutral-600 dark:text-neutral-400 flex flex-col gap-1">
              <span className="flex justify-between font-mono tabular-nums">
                <span>Candidate Lines</span>
                <span>{multiPv}</span>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={multiPv}
                onChange={(e) => setMultiPv(Number(e.target.value))}
                className="accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {engineError && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/25 rounded-lg p-2.5">
              {engineError}
            </div>
          )}

          <div className="divide-y divide-neutral-100 dark:divide-[#262B33] border-t border-neutral-100 dark:border-[#262B33]">
            {engineLines.length === 0 ? (
              <div className="py-4 text-xs text-neutral-500 dark:text-neutral-400">
                {chessState.isGameOver()
                  ? gameStatusText
                  : isAnalyzing
                  ? 'Initializing Web Worker engine...'
                  : 'Enable analysis to inspect Stockfish candidate lines.'}
              </div>
            ) : (
              engineLines.map((line) => (
                <button
                  key={line.multipv}
                  type="button"
                  onClick={() => line.pvUci[0] && handlePlayEngineMove(line.pvUci[0])}
                  className="w-full text-left py-2.5 px-1.5 hover:bg-neutral-50 dark:hover:bg-white/[0.03] flex items-start gap-3 transition-colors cursor-pointer"
                >
                  <span
                    className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                      (line.cp ?? 0) >= 0 || (line.mate ?? 0) > 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-200 dark:bg-[#282D35] text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {line.evalLabel}
                  </span>
                  <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed truncate">
                    {line.pvSan.slice(0, 8).join(' ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Move Notation & Export */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Moves & Notation
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(currentFen);
                  notify('FEN copied to clipboard');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-[#2A2F38] text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
              >
                <Copy className="w-3 h-3" /> FEN
              </button>
              <button
                type="button"
                onClick={() => {
                  const pgn = buildPgnString();
                  navigator.clipboard?.writeText(pgn);
                  notify('PGN copied to clipboard');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-[#2A2F38] text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
              >
                <Copy className="w-3 h-3" /> PGN
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([buildPgnString()], { type: 'application/x-chess-pgn' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `chessai-${opening.eco.toLowerCase()}.pgn`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-[#2A2F38] text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
                aria-label="Download PGN"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto border border-neutral-100 dark:border-[#262B33] rounded-lg p-2 bg-neutral-50/70 dark:bg-[#13161A]">
            {movePairs.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 p-2">
                Play moves on the board or click a Stockfish candidate line above.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-0.5 font-mono text-xs tabular-nums">
                {movePairs.map((pair) => (
                  <div key={pair.num} className="grid grid-cols-12 items-center">
                    <span className="col-span-2 text-neutral-400 dark:text-neutral-500 px-1.5 py-1">
                      {pair.num}.
                    </span>
                    <button
                      type="button"
                      onClick={() => pair.white && setCursor(pair.white.ply)}
                      className={`col-span-5 text-left px-2 py-1 rounded cursor-pointer ${
                        cursor === pair.white?.ply
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-white/5'
                      }`}
                    >
                      {pair.white?.san}
                    </button>
                    {pair.black ? (
                      <button
                        type="button"
                        onClick={() => pair.black && setCursor(pair.black.ply)}
                        className={`col-span-5 text-left px-2 py-1 rounded cursor-pointer ${
                          cursor === pair.black.ply
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-white/5'
                        }`}
                      >
                        {pair.black.san}
                      </button>
                    ) : (
                      <span className="col-span-5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSendToEditor(currentFen)}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
            >
              Open in Position Editor
            </button>
            {sanHistory.length > 0 && (
              <button
                type="button"
                onClick={() => onSendToReview(buildPgnString())}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
              >
                Full Game Review
              </button>
            )}
          </div>
        </section>

        {/* Gemini AI Coach Quick Explain */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              AI Chess Coach
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSendToCoach(currentFen, engineLines)}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Open Full Coach
              </button>
              <button
                type="button"
                onClick={handleAskQuickCoach}
                disabled={coachLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {coachLoading ? 'Analysing...' : 'Explain Position'}
              </button>
            </div>
          </div>

          {coachError && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/25 rounded-lg p-2.5">
              {coachError}
            </div>
          )}

          {coachAnswer ? (
            <div className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
              {coachAnswer}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Click Explain Position to have Gemini interpret the live Stockfish evaluation, tactical threats, and strategic plans.
            </p>
          )}
        </section>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Import FEN or PGN
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste a FEN string or complete PGN notation..."
              className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] p-3 font-mono text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
            />

            {importError && <p className="text-xs text-red-500">{importError}</p>}

            <div className="flex items-center justify-between gap-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.fen,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    file.text().then((txt) => setImportText(txt));
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 cursor-pointer"
                >
                  Load .PGN File
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-2 rounded-lg text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer"
                >
                  Load onto Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#1A1D22] border border-emerald-500/40 text-xs font-medium text-white shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
