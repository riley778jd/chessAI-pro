import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Cpu,
  Edit3,
  FileSearch,
  History,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';
import { SAMPLE_GAMES } from '../data/training';
import type {
  AnalysisHistoryRecord,
  NavSection,
  SavedGameRecord,
  TrainingProgressRecord,
} from '../types/chess';

interface DashboardHubViewProps {
  games: SavedGameRecord[];
  analyses: AnalysisHistoryRecord[];
  trainingProgress: TrainingProgressRecord[];
  onNavigate: (section: NavSection) => void;
  onReviewSamplePgn: (pgn: string) => void;
  onOpenSavedGame: (pgn: string) => void;
}

const WORKSPACE_TILES: {
  id: NavSection;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'analyse',
    title: 'Analyse Position',
    description: 'Real-time Stockfish 19 Multi-PV evaluation, move tree, and FEN/PGN tools.',
    icon: Cpu,
  },
  {
    id: 'review',
    title: 'Analyse Game',
    description: 'Ply-by-ply accuracy scoring, blunder detection, eval graph, and AI report.',
    icon: FileSearch,
  },
  {
    id: 'play',
    title: 'Play Against AI',
    description: 'Calibrated Stockfish opponents (800–2800 Elo) with live clocks & review.',
    icon: Swords,
  },
  {
    id: 'openings',
    title: 'Opening Explorer',
    description: 'ECO repertoire trees, Master win/draw/loss stats, and AI opening tutoring.',
    icon: Compass,
  },
  {
    id: 'training',
    title: 'Chess Training',
    description: 'Tactical motifs, checkmate patterns, and opening traps by difficulty.',
    icon: Target,
  },
  {
    id: 'endgames',
    title: 'Endgame Training',
    description: 'Lucena, Philidor, and King-and-Pawn theory tested live vs Stockfish.',
    icon: Trophy,
  },
  {
    id: 'editor',
    title: 'Position Editor',
    description: 'Visual board composer for custom FEN, castling rights, and en passant.',
    icon: Edit3,
  },
  {
    id: 'coach',
    title: 'AI Chess Coach',
    description: 'Interactive Gemini coaching grounded directly in Stockfish UCI output.',
    icon: Sparkles,
  },
];

export const DashboardHubView: React.FC<DashboardHubViewProps> = ({
  games,
  analyses,
  trainingProgress,
  onNavigate,
  onReviewSamplePgn,
  onOpenSavedGame,
}) => {
  const solvedCount = trainingProgress.filter((t) => t.solved).length;

  return (
    <div className="space-y-8">
      {/* Hero Summary Row */}
      <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance">
            Grandmaster Analysis, Engine Precision & AI Coaching
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Run local Stockfish 19 UCI analysis in a dedicated Web Worker, review complete PGN games for accuracy and blunders, practice endgames, or consult the Gemini AI Chess Coach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('analyse')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Open Analysis Board <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('play')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-emerald-500/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Play vs Stockfish
          </button>
        </div>
      </div>

      {/* Real Activity Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 text-left hover:border-emerald-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Saved Games</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
            {games.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 text-left hover:border-emerald-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Saved Analyses</span>
            <History className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
            {analyses.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('training')}
          className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 text-left hover:border-emerald-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Exercises Solved</span>
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
            {solvedCount}
          </div>
        </button>
      </div>

      {/* Workspace Grid */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Workspaces
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {WORKSPACE_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onNavigate(tile.id)}
                className="group rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 text-left hover:border-emerald-500/60 transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {tile.title}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {tile.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom Split: Classic Games to Review + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Featured Master Games for Review
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('review')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Import PGN
            </button>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-[#262B33]">
            {SAMPLE_GAMES.map((sg) => (
              <div key={sg.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {sg.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {sg.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onReviewSamplePgn(sg.pgn)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Recent Saved Games
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('saved')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          {games.length === 0 ? (
            <p className="py-6 text-xs text-neutral-500 dark:text-neutral-400">
              Games played against Stockfish or saved from the analysis board will appear here automatically.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-[#262B33]">
              {games.slice(0, 4).map((g) => (
                <div key={g.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {g.title}
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                      {g.result} · {g.eco} · {new Date(g.updatedAtMs).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSavedGame(g.pgn)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium hover:border-emerald-500/50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
