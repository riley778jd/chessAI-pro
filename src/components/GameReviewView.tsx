import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Sparkles,
  Upload,
} from 'lucide-react';
import { stockfishService } from '../engine/stockfishService';
import { SAMPLE_GAMES } from '../data/training';
import { detectOpeningFromMoves } from '../data/openings';
import {
  classifyMoveFromEval,
  evalToWhiteWinPercent,
  formatEvalScore,
  moveAccuracyFromWinLoss,
  normalizeEvalForBar,
  uciLineToSan,
} from '../utils/chessHelpers';
import type {
  GameReport,
  GameReviewResult,
  MoveClassification,
  ReviewedMove,
  SavedGameRecord,
  UserSettings,
} from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';
import { EvaluationGraph } from './EvaluationGraph';
import { generateSafeId } from '../services/storageService';

interface GameReviewViewProps {
  settings: UserSettings;
  initialPgn?: string;
  onSaveGame: (game: SavedGameRecord) => void;
}

const CLASSIFICATION_STYLES: Record<
  MoveClassification,
  { label: string; symbol: string; colorClass: string }
> = {
  brilliant: { label: 'Brilliant', symbol: '!!', colorClass: 'text-cyan-400' },
  great: { label: 'Great', symbol: '!', colorClass: 'text-sky-400' },
  best: { label: 'Best', symbol: '★', colorClass: 'text-emerald-400' },
  good: { label: 'Good', symbol: '✓', colorClass: 'text-emerald-500/80' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', colorClass: 'text-amber-400' },
  mistake: { label: 'Mistake', symbol: '?', colorClass: 'text-orange-400' },
  blunder: { label: 'Blunder', symbol: '??', colorClass: 'text-red-500' },
};

export const GameReviewView: React.FC<GameReviewViewProps> = ({
  settings,
  initialPgn,
  onSaveGame,
}) => {
  const [pgnInput, setPgnInput] = useState(initialPgn || SAMPLE_GAMES[0].pgn);
  const [reviewResult, setReviewResult] = useState<GameReviewResult | null>(null);
  const [activePly, setActivePly] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [reviewDepth, setReviewDepth] = useState(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiReport, setAiReport] = useState<GameReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (initialPgn) {
      setPgnInput(initialPgn);
      setReviewResult(null);
      setAiReport(null);
      setActivePly(0);
    }
  }, [initialPgn]);

  const parsedPlies = useMemo(() => {
    try {
      const c = new Chess();
      c.loadPgn(pgnInput);
      const headers = c.getHeaders();
      const history = c.history({ verbose: true });
      const replay = new Chess();
      const positions: { fen: string; lastMove: { from: string; to: string } | null }[] = [
        { fen: replay.fen(), lastMove: null },
      ];
      for (const m of history) {
        replay.move(m.san);
        positions.push({ fen: replay.fen(), lastMove: { from: m.from, to: m.to } });
      }
      return {
        valid: true,
        headers,
        history,
        positions,
        opening: detectOpeningFromMoves(history.map((m) => m.san)),
      };
    } catch {
      return null;
    }
  }, [pgnInput]);

  const activeFen = useMemo(() => {
    if (reviewResult && activePly > 0 && reviewResult.moves[activePly - 1]) {
      return reviewResult.moves[activePly - 1].fenAfter;
    }
    if (parsedPlies && parsedPlies.positions[activePly]) {
      return parsedPlies.positions[activePly].fen;
    }
    return new Chess().fen();
  }, [reviewResult, parsedPlies, activePly]);

  const activeLastMove = useMemo(() => {
    if (parsedPlies && parsedPlies.positions[activePly]) {
      return parsedPlies.positions[activePly].lastMove;
    }
    return null;
  }, [parsedPlies, activePly]);

  const activeReviewedMove = useMemo(() => {
    if (!reviewResult || activePly === 0) return null;
    return reviewResult.moves[activePly - 1] || null;
  }, [reviewResult, activePly]);

  const runFullGameReview = async () => {
    if (!parsedPlies || parsedPlies.history.length === 0) {
      setErrorMsg('Load a valid PGN with at least 1 move before starting Stockfish review.');
      return;
    }

    cancelRef.current = false;
    setErrorMsg(null);
    setAiReport(null);
    setIsReviewing(true);

    const history = parsedPlies.history;
    const fens = parsedPlies.positions.map((p) => p.fen);
    setProgress({ current: 0, total: fens.length });

    try {
      const evals: { cp: number; label: string; bestUci: string }[] = [];

      for (let i = 0; i < fens.length; i++) {
        if (cancelRef.current) {
          setIsReviewing(false);
          return;
        }
        const checkChess = new Chess(fens[i]);
        if (checkChess.isCheckmate()) {
          const winnerSign = checkChess.turn() === 'w' ? -1 : 1;
          evals.push({ cp: winnerSign * 2000, label: winnerSign > 0 ? '#0' : '-#0', bestUci: '' });
        } else if (checkChess.isDraw()) {
          evals.push({ cp: 0, label: '0.00', bestUci: '' });
        } else {
          const res = await stockfishService.evaluateSinglePosition(fens[i], {
            depth: reviewDepth,
            skillLevel: 20,
          });
          const line = res.line;
          let cp = line?.cp ?? 0;
          if (typeof line?.mate === 'number') {
            cp = line.mate > 0 ? 1500 - Math.min(20, line.mate) * 10 : -1500 + Math.min(20, Math.abs(line.mate)) * 10;
          }
          evals.push({
            cp,
            label: line?.evalLabel ?? formatEvalScore(cp),
            bestUci: res.bestMove || line?.pvUci[0] || '',
          });
        }
        setProgress({ current: i + 1, total: fens.length });
      }

      const reviewedMoves: ReviewedMove[] = [];
      const counts = {
        w: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
        b: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
      };

      const whiteAccList: number[] = [];
      const blackAccList: number[] = [];

      for (let i = 0; i < history.length; i++) {
        const m = history[i];
        const before = evals[i];
        const after = evals[i + 1];
        const uci = `${m.from}${m.to}${m.promotion || ''}`;
        const bestSanList = before.bestUci ? uciLineToSan(m.before, [before.bestUci]) : [];
        const bestMoveSan = bestSanList[0] || before.bestUci;

        const winBeforeWhite = evalToWhiteWinPercent(before.cp);
        const winAfterWhite = evalToWhiteWinPercent(after.cp);

        const winLoss =
          m.color === 'w'
            ? Math.max(0, winBeforeWhite - winAfterWhite)
            : Math.max(0, winAfterWhite - winBeforeWhite);

        const cpLoss =
          m.color === 'w'
            ? Math.max(0, before.cp - after.cp)
            : Math.max(0, after.cp - before.cp);

        const acc = moveAccuracyFromWinLoss(winLoss);
        if (m.color === 'w') whiteAccList.push(acc);
        else blackAccList.push(acc);

        const isSacrifice = Boolean(m.captured) === false && cpLoss <= 10 && uci === before.bestUci;
        const classification = classifyMoveFromEval(cpLoss, winLoss, uci, before.bestUci, isSacrifice && i > 8);
        counts[m.color][classification] += 1;

        reviewedMoves.push({
          ply: i + 1,
          moveNumber: Math.floor(i / 2) + 1,
          color: m.color,
          san: m.san,
          uci,
          fenBefore: m.before,
          fenAfter: m.after,
          bestMoveUci: before.bestUci,
          bestMoveSan,
          evalBeforeCp: before.cp,
          evalAfterCp: after.cp,
          evalBeforeLabel: before.label,
          evalAfterLabel: after.label,
          cpLoss,
          accuracy: acc,
          classification,
        });
      }

      const avg = (arr: number[]) =>
        arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 100;

      const resultObj: GameReviewResult = {
        pgn: pgnInput,
        white: parsedPlies.headers.White || 'White',
        black: parsedPlies.headers.Black || 'Black',
        result: parsedPlies.headers.Result || '*',
        eco: parsedPlies.headers.ECO || parsedPlies.opening.eco,
        openingName: parsedPlies.opening.name,
        whiteAccuracy: avg(whiteAccList),
        blackAccuracy: avg(blackAccList),
        moves: reviewedMoves,
        counts,
      };

      setReviewResult(resultObj);
      setActivePly(reviewedMoves.length);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Stockfish review failed.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleGenerateAiReport = async () => {
    if (!reviewResult) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const criticalMoments = reviewResult.moves
        .filter((m) => ['blunder', 'mistake', 'inaccuracy', 'brilliant'].includes(m.classification))
        .sort((a, b) => b.cpLoss - a.cpLoss)
        .slice(0, 12)
        .map((m) => ({
          moveNumber: m.moveNumber,
          color: m.color,
          playedSan: m.san,
          bestSan: m.bestMoveSan,
          classification: m.classification,
          evalBefore: m.evalBeforeLabel,
          evalAfter: m.evalAfterLabel,
          cpLoss: m.cpLoss,
        }));

      const resp = await fetch('/api/coach/review-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pgn: reviewResult.pgn,
          white: reviewResult.white,
          black: reviewResult.black,
          result: reviewResult.result,
          whiteAccuracy: reviewResult.whiteAccuracy,
          blackAccuracy: reviewResult.blackAccuracy,
          criticalMoments,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate AI game report.');
      }
      setAiReport(data.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to reach Gemini coach.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSaveReviewedGame = () => {
    if (!parsedPlies) return;
    const record: SavedGameRecord = {
      id: generateSafeId('review'),
      title: `${parsedPlies.headers.White || 'White'} vs ${parsedPlies.headers.Black || 'Black'}`,
      white: parsedPlies.headers.White || 'White',
      black: parsedPlies.headers.Black || 'Black',
      result: (['1-0', '0-1', '1/2-1/2', '*'].includes(parsedPlies.headers.Result || '')
        ? parsedPlies.headers.Result
        : '*') as SavedGameRecord['result'],
      eco: parsedPlies.opening.eco,
      openingName: parsedPlies.opening.name,
      pgn: pgnInput,
      initialFen: parsedPlies.positions[0].fen,
      mode: 'review',
      accuracyWhite: reviewResult?.whiteAccuracy,
      accuracyBlack: reviewResult?.blackAccuracy,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
    onSaveGame(record);
    setSavedNotice('Game saved to library.');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const reviewArrows = useMemo(() => {
    if (!activeReviewedMove || !activeReviewedMove.bestMoveUci) return [];
    if (activeReviewedMove.uci === activeReviewedMove.bestMoveUci) return [];
    const uci = activeReviewedMove.bestMoveUci;
    return [{ from: uci.slice(0, 2), to: uci.slice(2, 4) }];
  }, [activeReviewedMove]);

  return (
    <div className="space-y-6">
      {/* Top Bar: PGN Loader + Sample Classics */}
      <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Full Game Review & Accuracy Report
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Stockfish evaluates every ply to classify brilliant moves, mistakes, blunders, and player accuracy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_GAMES.map((sg) => (
              <button
                key={sg.id}
                type="button"
                onClick={() => {
                  setPgnInput(sg.pgn);
                  setReviewResult(null);
                  setAiReport(null);
                  setActivePly(0);
                }}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {sg.title.split(' (')[0]}
              </button>
            ))}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                file.text().then((txt) => {
                  setPgnInput(txt);
                  setReviewResult(null);
                  setActivePly(0);
                });
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Load .PGN
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={pgnInput}
          onChange={(e) => {
            setPgnInput(e.target.value);
            setReviewResult(null);
            setActivePly(0);
          }}
          placeholder="Paste PGN game notation here..."
          className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] p-2.5 font-mono text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span>Review Depth:</span>
              <select
                value={reviewDepth}
                onChange={(e) => setReviewDepth(Number(e.target.value))}
                className="rounded-md border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-2 py-1 font-mono text-xs text-neutral-900 dark:text-neutral-100"
              >
                <option value={8}>Fast (Depth 8)</option>
                <option value={10}>Standard (Depth 10)</option>
                <option value={13}>Deep (Depth 13)</option>
              </select>
            </label>
            {parsedPlies && (
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                {parsedPlies.history.length} moves · {parsedPlies.opening.eco} {parsedPlies.opening.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isReviewing ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                  stockfishService.stopCurrent();
                  setIsReviewing(false);
                }}
                className="px-4 py-2 rounded-lg border border-red-500/40 text-red-500 text-xs font-medium cursor-pointer"
              >
                Cancel ({progress.current}/{progress.total})
              </button>
            ) : (
              <button
                type="button"
                onClick={runFullGameReview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Cpu className="w-4 h-4" /> Analyse Full Game
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveReviewedGame}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Save Game
            </button>
          </div>
        </div>

        {isReviewing && (
          <div className="w-full bg-neutral-200 dark:bg-[#252A32] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-150"
              style={{
                width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        )}

        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        {savedNotice && <p className="text-xs text-emerald-500">{savedNotice}</p>}
      </div>

      {/* Main Split: Board & Graph / Move Review & AI Report */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-6 space-y-4">
          <InteractiveBoard
            fen={activeFen}
            boardTheme={settings.boardTheme}
            pieceStyle={settings.pieceStyle}
            showCoordinates={settings.showCoordinates}
            interactive={false}
            lastMove={activeLastMove}
            arrows={reviewArrows}
            showEvalBar={settings.showEvalBar}
            evalScore={
              activeReviewedMove
                ? normalizeEvalForBar(activeReviewedMove.evalAfterCp)
                : 0
            }
            evalLabel={activeReviewedMove?.evalAfterLabel || '0.0'}
          />

          <div className="flex items-center justify-between max-w-[600px] mx-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePly((p) => Math.max(0, p - 1))}
                disabled={activePly === 0}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setActivePly((p) =>
                    Math.min((parsedPlies?.positions.length ?? 1) - 1, p + 1)
                  )
                }
                disabled={!parsedPlies || activePly >= parsedPlies.positions.length - 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {activeReviewedMove && (
              <div className="text-xs font-mono tabular-nums">
                <span className={CLASSIFICATION_STYLES[activeReviewedMove.classification].colorClass}>
                  {activeReviewedMove.moveNumber}
                  {activeReviewedMove.color === 'w' ? '.' : '...'} {activeReviewedMove.san}{' '}
                  ({CLASSIFICATION_STYLES[activeReviewedMove.classification].label})
                </span>
                {activeReviewedMove.bestMoveSan &&
                  activeReviewedMove.uci !== activeReviewedMove.bestMoveUci && (
                    <span className="text-neutral-500 dark:text-neutral-400 ml-2">
                      · Best: {activeReviewedMove.bestMoveSan}
                    </span>
                  )}
              </div>
            )}
          </div>

          <EvaluationGraph
            moves={reviewResult?.moves || []}
            activePly={activePly}
            onSelectPly={(ply) => setActivePly(ply)}
          />
        </div>

        <div className="xl:col-span-6 space-y-4">
          {reviewResult ? (
            <>
              {/* Accuracy & Move Classification Summary */}
              <div className="grid grid-cols-2 gap-4">
                {(['w', 'b'] as const).map((side) => {
                  const name = side === 'w' ? reviewResult.white : reviewResult.black;
                  const acc = side === 'w' ? reviewResult.whiteAccuracy : reviewResult.blackAccuracy;
                  const c = reviewResult.counts[side];
                  return (
                    <div
                      key={side}
                      className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
                          {side === 'w' ? 'White' : 'Black'} · {name}
                        </span>
                        <span className="text-lg font-mono font-bold text-emerald-500 tabular-nums">
                          {acc}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs font-mono tabular-nums pt-1 border-t border-neutral-100 dark:border-[#262B33]">
                        <span className="text-cyan-400">!! {c.brilliant}</span>
                        <span className="text-emerald-400">★ {c.best}</span>
                        <span className="text-amber-400">?! {c.inaccuracy}</span>
                        <span className="text-orange-400">? {c.mistake}</span>
                        <span className="text-red-500">?? {c.blunder}</span>
                        <span className="text-neutral-400">✓ {c.good + c.great}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Annotated Move List */}
              <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Move-by-Move Classification
                  </h3>
                  <button
                    type="button"
                    onClick={handleGenerateAiReport}
                    disabled={reportLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {reportLoading ? 'Writing Report...' : 'Generate AI Game Report'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#242932] text-xs font-mono tabular-nums">
                  {reviewResult.moves.map((m) => {
                    const style = CLASSIFICATION_STYLES[m.classification];
                    return (
                      <button
                        key={m.ply}
                        type="button"
                        onClick={() => setActivePly(m.ply)}
                        className={`w-full grid grid-cols-12 items-center px-2 py-1.5 text-left transition-colors cursor-pointer ${
                          activePly === m.ply
                            ? 'bg-emerald-500/15'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="col-span-2 text-neutral-500">
                          {m.moveNumber}
                          {m.color === 'w' ? '.' : '...'}
                        </span>
                        <span className="col-span-3 font-semibold text-neutral-900 dark:text-neutral-100">
                          {m.san}
                        </span>
                        <span className={`col-span-3 ${style.colorClass}`}>
                          {style.symbol} {style.label}
                        </span>
                        <span className="col-span-2 text-neutral-500 truncate">
                          {m.uci !== m.bestMoveUci ? m.bestMoveSan : '—'}
                        </span>
                        <span className="col-span-2 text-right text-neutral-600 dark:text-neutral-300">
                          {m.evalAfterLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {reportError && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
                  {reportError}
                </div>
              )}

              {aiReport && (
                <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Grandmaster Post-Game Report
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {aiReport.summary}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">White Insights</h4>
                      <ul className="space-y-1 text-neutral-600 dark:text-neutral-300 list-disc pl-4">
                        {aiReport.whiteStrengths.map((s, i) => <li key={i}>{s}</li>)}
                        {aiReport.whiteWeaknesses.map((w, i) => <li key={`w-${i}`} className="text-amber-500 dark:text-amber-400">{w}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Black Insights</h4>
                      <ul className="space-y-1 text-neutral-600 dark:text-neutral-300 list-disc pl-4">
                        {aiReport.blackStrengths.map((s, i) => <li key={i}>{s}</li>)}
                        {aiReport.blackWeaknesses.map((w, i) => <li key={`w-${i}`} className="text-amber-500 dark:text-amber-400">{w}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-100 dark:border-[#262B33]">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Key Turning Points</h4>
                    <ul className="space-y-1 text-neutral-600 dark:text-neutral-300 list-disc pl-4">
                      {aiReport.keyTurningPoints.map((tp, i) => <li key={i}>{tp}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-100 dark:border-[#262B33]">
                    <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">Personalized Training Focus</h4>
                    <ul className="space-y-1 text-neutral-600 dark:text-neutral-300 list-disc pl-4">
                      {aiReport.trainingRecommendations.map((tr, i) => <li key={i}>{tr}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-6 space-y-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Ready for Game Review
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Click Analyse Full Game above to compute Stockfish centipawn loss across every move, classify blunders and brilliant sacrifices, chart the evaluation swing graph, and generate your Gemini AI coaching report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
