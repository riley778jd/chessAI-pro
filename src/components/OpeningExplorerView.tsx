import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeftRight, ChevronLeft, Database, RotateCcw, Sparkles } from 'lucide-react';
import {
  detectOpeningFromMoves,
  LOCAL_OPENING_TREE,
  type OpeningContinuation,
} from '../data/openings';
import type { UserSettings } from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';
import { stockfishService } from '../engine/stockfishService';

interface OpeningExplorerViewProps {
  settings: UserSettings;
  onOpenInAnalyser: (pgn: string) => void;
}

export const OpeningExplorerView: React.FC<OpeningExplorerViewProps> = ({
  settings,
  onOpenInAnalyser,
}) => {
  const [sanHistory, setSanHistory] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [dbMode, setDbMode] = useState<'masters' | 'lichess'>('masters');

  const [remoteMoves, setRemoteMoves] = useState<OpeningContinuation[] | null>(null);
  const [remoteOpeningName, setRemoteOpeningName] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'lichess-masters' | 'lichess-global' | 'local-eco'>('local-eco');
  const [loadingRemote, setLoadingRemote] = useState(false);

  const [coachExplanation, setCoachExplanation] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const chessInstance = useMemo(() => {
    const c = new Chess();
    for (const san of sanHistory) {
      try {
        c.move(san);
      } catch {
        break;
      }
    }
    return c;
  }, [sanHistory]);

  const currentFen = chessInstance.fen();
  const detectedEco = useMemo(() => detectOpeningFromMoves(sanHistory), [sanHistory]);
  const localNode = LOCAL_OPENING_TREE[sanHistory.join(' ')];

  useEffect(() => {
    let active = true;
    setLoadingRemote(true);
    setCoachExplanation(null);

    fetch(`/api/openings/lichess?fen=${encodeURIComponent(currentFen)}&db=${dbMode}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Offline or rate-limited');
        return res.json();
      })
      .then((payload) => {
        if (!active) return;
        const data = payload?.data;
        if (!data || !Array.isArray(data.moves)) {
          throw new Error('Invalid format');
        }
        const mapped: OpeningContinuation[] = data.moves.map(
          (m: {
            san: string;
            uci: string;
            white: number;
            draws: number;
            black: number;
            opening?: { eco?: string; name?: string };
          }) => {
            const total = Math.max(1, (m.white || 0) + (m.draws || 0) + (m.black || 0));
            return {
              san: m.san,
              uci: m.uci,
              eco: m.opening?.eco || detectedEco.eco,
              name: m.opening?.name || detectedEco.name,
              whiteWins: Math.round(((m.white || 0) / total) * 100),
              draws: Math.round(((m.draws || 0) / total) * 100),
              blackWins: Math.round(((m.black || 0) / total) * 100),
              totalGames: total,
            };
          }
        );
        setRemoteMoves(mapped);
        setRemoteOpeningName(data.opening?.name ? `${data.opening.eco || ''} · ${data.opening.name}` : null);
        setDataSource(payload.source);
      })
      .catch(() => {
        if (!active) return;
        setRemoteMoves(null);
        setRemoteOpeningName(null);
        setDataSource('local-eco');
      })
      .finally(() => {
        if (active) setLoadingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [currentFen, dbMode, detectedEco.eco, detectedEco.name]);

  const handleMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    try {
      const next = new Chess(currentFen);
      const m = next.move({ from, to, promotion: promotion || 'q' });
      if (!m) return false;
      setSanHistory((prev) => [...prev, m.san]);
      return true;
    } catch {
      return false;
    }
  };

  const handleContinuationClick = (san: string) => {
    try {
      const next = new Chess(currentFen);
      const m = next.move(san);
      if (m) setSanHistory((prev) => [...prev, m.san]);
    } catch {
      // ignore
    }
  };

  const handleAskOpeningPrinciples = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const evalRes = await stockfishService.evaluateSinglePosition(currentFen, { depth: 12 });
      const lines = evalRes.line ? [evalRes.line] : [];
      if (lines.length === 0) {
        throw new Error('Could not compute Stockfish baseline for this opening.');
      }
      const resp = await fetch('/api/coach/explain-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: currentFen,
          turn: chessInstance.turn(),
          stockfishLines: lines,
          gamePhase: 'Opening',
          lastMoveSan: sanHistory[sanHistory.length - 1] || '',
          focusArea: 'opening',
          question: `Explain the opening principles, pawn structure, and strategic plans for ${detectedEco.eco} ${detectedEco.name} after ${sanHistory.join(' ') || 'starting position'}.`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'AI Coach unavailable.');
      setCoachExplanation(data.answer);
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Unable to reach AI Coach.');
    } finally {
      setCoachLoading(false);
    }
  };

  const activeContinuations =
    dataSource !== 'local-eco' && remoteMoves ? remoteMoves : localNode?.continuations || [];

  const historyMoves = chessInstance.history({ verbose: true });
  const lastMove =
    historyMoves.length > 0
      ? { from: historyMoves[historyMoves.length - 1].from, to: historyMoves[historyMoves.length - 1].to }
      : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-6 space-y-3">
        <div className="max-w-[600px] mx-auto flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {remoteOpeningName || `${detectedEco.eco} · ${detectedEco.name}`}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              {sanHistory.length ? sanHistory.join(' ') : 'Starting Position'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSanHistory((prev) => prev.slice(0, -1))}
              disabled={sanHistory.length === 0}
              className="p-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] disabled:opacity-40 cursor-pointer"
              aria-label="Step back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSanHistory([])}
              disabled={sanHistory.length === 0}
              className="p-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] disabled:opacity-40 cursor-pointer"
              aria-label="Reset opening"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              className="p-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] cursor-pointer"
              aria-label="Flip board"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <InteractiveBoard
          fen={currentFen}
          orientation={orientation}
          boardTheme={settings.boardTheme}
          pieceStyle={settings.pieceStyle}
          showCoordinates={settings.showCoordinates}
          lastMove={lastMove}
          onMove={handleMove}
        />

        <div className="max-w-[600px] mx-auto flex justify-end">
          <button
            type="button"
            onClick={() => onOpenInAnalyser(chessInstance.pgn())}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/50 cursor-pointer"
          >
            Analyse Line in Engine
          </button>
        </div>
      </div>

      <div className="xl:col-span-6 space-y-4">
        {/* Source & Continuations */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Source:{' '}
                {dataSource === 'lichess-masters'
                  ? 'Lichess Masters DB'
                  : dataSource === 'lichess-global'
                  ? 'Lichess 2000+ DB'
                  : 'Local Curated ECO Database'}
              </span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417]">
              {(['masters', 'lichess'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDbMode(m)}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    dbMode === m
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {m === 'masters' ? 'Masters' : 'Club/2000+'}
                </button>
              ))}
            </div>
          </div>

          {loadingRemote && (
            <p className="text-xs text-neutral-500">Querying opening database...</p>
          )}

          {activeContinuations.length === 0 ? (
            <div className="py-4 text-xs text-neutral-500 dark:text-neutral-400">
              No database continuations indexed at this exact depth. Play a move on the board or step back to explore mainlines.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-[#262B33]">
              <div className="grid grid-cols-12 pb-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                <span className="col-span-3">Move</span>
                <span className="col-span-3 text-right">Games</span>
                <span className="col-span-6 pl-3">White / Draw / Black %</span>
              </div>
              {activeContinuations.map((c) => (
                <button
                  key={c.san}
                  type="button"
                  onClick={() => handleContinuationClick(c.san)}
                  className="w-full grid grid-cols-12 items-center py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="col-span-3">
                    <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {c.san}
                    </span>
                    <div className="text-[11px] text-neutral-500 truncate">{c.eco}</div>
                  </div>
                  <div className="col-span-3 text-right font-mono text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
                    {c.totalGames.toLocaleString()}
                  </div>
                  <div className="col-span-6 pl-3 space-y-1">
                    <div className="w-full h-2.5 rounded overflow-hidden flex bg-neutral-200 dark:bg-[#282D35]">
                      <div className="bg-[#EAECEF]" style={{ width: `${c.whiteWins}%` }} />
                      <div className="bg-[#7C8594]" style={{ width: `${c.draws}%` }} />
                      <div className="bg-[#1B1F24]" style={{ width: `${c.blackWins}%` }} />
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-neutral-500 tabular-nums">
                      <span>{c.whiteWins}%</span>
                      <span>{c.draws}%</span>
                      <span>{c.blackWins}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Strategic Notes & AI Opening Coach */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Opening Principles & Plans
            </h3>
            <button
              type="button"
              onClick={handleAskOpeningPrinciples}
              disabled={coachLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {coachLoading ? 'Thinking...' : 'AI Opening Tutor'}
            </button>
          </div>

          {localNode && (
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <p>{localNode.description}</p>
              <ul className="list-disc pl-4 space-y-1">
                {localNode.keyIdeas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>
          )}

          {coachError && <p className="text-xs text-red-500">{coachError}</p>}

          {coachExplanation && (
            <div className="pt-2 border-t border-neutral-100 dark:border-[#262B33] text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-line">
              {coachExplanation}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
