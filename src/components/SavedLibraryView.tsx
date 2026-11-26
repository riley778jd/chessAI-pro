import React, { useMemo, useState } from 'react';
import { BookOpen, Cpu, Search, Trash2 } from 'lucide-react';
import type { AnalysisHistoryRecord, SavedGameRecord } from '../types/chess';

interface SavedLibraryViewProps {
  games: SavedGameRecord[];
  analyses: AnalysisHistoryRecord[];
  isSignedIn: boolean;
  onOpenGameInAnalyser: (pgn: string) => void;
  onOpenGameInReview: (pgn: string) => void;
  onOpenFenInAnalyser: (fen: string) => void;
  onDeleteGame: (id: string) => void;
  onDeleteAnalysis: (id: string) => void;
}

export const SavedLibraryView: React.FC<SavedLibraryViewProps> = ({
  games,
  analyses,
  isSignedIn,
  onOpenGameInAnalyser,
  onOpenGameInReview,
  onOpenFenInAnalyser,
  onDeleteGame,
  onDeleteAnalysis,
}) => {
  const [tab, setTab] = useState<'games' | 'analyses'>('games');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.openingName.toLowerCase().includes(q) ||
        g.white.toLowerCase().includes(q) ||
        g.black.toLowerCase().includes(q)
    );
  }, [games, searchQuery]);

  const filteredAnalyses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return analyses;
    return analyses.filter(
      (a) =>
        a.fen.toLowerCase().includes(q) ||
        a.bestMove.toLowerCase().includes(q) ||
        a.coachSummary.toLowerCase().includes(q)
    );
  }, [analyses, searchQuery]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-lg bg-neutral-100 dark:bg-[#121417]">
          <button
            type="button"
            onClick={() => setTab('games')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              tab === 'games'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Saved Games ({games.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('analyses')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              tab === 'analyses'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Analysis History ({analyses.length})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search openings, players, FEN..."
              className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            {isSignedIn ? 'Cloud Sync Active' : 'Local Storage'}
          </span>
        </div>
      </div>

      {tab === 'games' ? (
        filteredGames.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-8 text-center space-y-2">
            <BookOpen className="w-6 h-6 text-neutral-400 mx-auto" />
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              No saved games yet
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Play a match against Stockfish or save an annotated game from Analyse Position / Game Review.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] divide-y divide-neutral-100 dark:divide-[#262B33]">
            {filteredGames.map((g) => (
              <div
                key={g.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02]"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {g.title}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                    {g.white} vs {g.black} · {g.result} · {g.eco} ·{' '}
                    {new Date(g.updatedAtMs).toLocaleDateString()}
                    {typeof g.accuracyWhite === 'number' && ` · Acc ${g.accuracyWhite}% / ${g.accuracyBlack}%`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenGameInAnalyser(g.pgn)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium hover:border-emerald-500/50 cursor-pointer"
                  >
                    Board
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenGameInReview(g.pgn)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteGame(g.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 cursor-pointer"
                    aria-label="Delete saved game"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredAnalyses.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-8 text-center space-y-2">
          <Cpu className="w-6 h-6 text-neutral-400 mx-auto" />
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            No saved position analyses yet
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Click Save inside Analyse Position to archive Stockfish lines and AI coaching notes.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] divide-y divide-neutral-100 dark:divide-[#262B33]">
          {filteredAnalyses.map((a) => (
            <div
              key={a.id}
              className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                  <span className="font-semibold text-emerald-500">{a.evalDisplay}</span>
                  <span className="text-neutral-500">· Best {a.bestMove} · Depth {a.depth}</span>
                  <span className="text-neutral-400">· {new Date(a.createdAtMs).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {a.coachSummary}
                </p>
                <p className="text-[11px] font-mono text-neutral-400 truncate">{a.fen}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenFenInAnalyser(a.fen)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer"
                >
                  Open Position
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteAnalysis(a.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 cursor-pointer"
                  aria-label="Delete analysis"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
