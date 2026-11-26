import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { CheckCircle2, Cpu, HelpCircle, RotateCcw, Trophy } from 'lucide-react';
import { ENDGAME_EXERCISES, TRAINING_PUZZLES } from '../data/training';
import { stockfishService } from '../engine/stockfishService';
import { playChessSound } from '../utils/soundFx';
import type {
  TrainingCategory,
  TrainingDifficulty,
  TrainingProgressRecord,
  UserSettings,
} from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';

interface TrainingCentreViewProps {
  mode: 'puzzles' | 'endgames';
  settings: UserSettings;
  progressRecords: TrainingProgressRecord[];
  onRecordProgress: (record: TrainingProgressRecord) => void;
  onOpenInAnalyser: (fen: string) => void;
}

export const TrainingCentreView: React.FC<TrainingCentreViewProps> = ({
  mode,
  settings,
  progressRecords,
  onRecordProgress,
  onOpenInAnalyser,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrainingCategory>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | TrainingDifficulty>('all');

  const filteredPuzzles = useMemo(() => {
    return TRAINING_PUZZLES.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (difficultyFilter !== 'all' && p.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [categoryFilter, difficultyFilter]);

  const filteredEndgames = useMemo(() => {
    return ENDGAME_EXERCISES.filter((e) => {
      if (difficultyFilter !== 'all' && e.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [difficultyFilter]);

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [endgameIndex, setEndgameIndex] = useState(0);

  const activePuzzle = filteredPuzzles[puzzleIndex] || filteredPuzzles[0] || TRAINING_PUZZLES[0];
  const activeEndgame =
    filteredEndgames[endgameIndex] || filteredEndgames[0] || ENDGAME_EXERCISES[0];

  const [fen, setFen] = useState(
    mode === 'puzzles' ? activePuzzle.fen : activeEndgame.fen
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ type: 'idle' | 'ok' | 'err' | 'done'; text: string }>({
    type: 'idle',
    text: mode === 'puzzles' ? 'Find the best move on the board.' : activeEndgame.instructions,
  });
  const [showHint, setShowHint] = useState(false);
  const [attemptsThisPuzzle, setAttemptsThisPuzzle] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [endgameAiThinking, setEndgameAiThinking] = useState(false);

  const chessRef = useRef(new Chess(mode === 'puzzles' ? activePuzzle.fen : activeEndgame.fen));

  useEffect(() => {
    const targetFen = mode === 'puzzles' ? activePuzzle.fen : activeEndgame.fen;
    chessRef.current = new Chess(targetFen);
    setFen(targetFen);
    setStepIdx(0);
    setShowHint(false);
    setAttemptsThisPuzzle(0);
    setLastMove(null);
    setEndgameAiThinking(false);
    setStatusMsg({
      type: 'idle',
      text:
        mode === 'puzzles'
          ? `${chessRef.current.turn() === 'w' ? 'White' : 'Black'} to move · ${activePuzzle.theme}`
          : activeEndgame.instructions,
    });
  }, [mode, activePuzzle, activeEndgame]);

  const solvedMap = useMemo(() => {
    const map = new Map<string, TrainingProgressRecord>();
    for (const r of progressRecords) {
      map.set(r.puzzleId, r);
    }
    return map;
  }, [progressRecords]);

  const stats = useMemo(() => {
    const relevant =
      mode === 'puzzles'
        ? TRAINING_PUZZLES.map((p) => p.id)
        : ENDGAME_EXERCISES.map((e) => e.id);
    const solvedCount = relevant.filter((id) => solvedMap.get(id)?.solved).length;
    const totalAttempts = relevant.reduce((sum, id) => sum + (solvedMap.get(id)?.attempts || 0), 0);
    return {
      solvedCount,
      total: relevant.length,
      totalAttempts,
    };
  }, [mode, solvedMap]);

  const handlePuzzleMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (statusMsg.type === 'done') return false;
    const expectedUci = activePuzzle.solutionUci[stepIdx];
    const playedUci = `${from}${to}${promotion || ''}`;
    const playedBase = `${from}${to}`;

    // Verify move legality first
    const testChess = new Chess(chessRef.current.fen());
    let moveObj;
    try {
      moveObj = testChess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      return false;
    }
    if (!moveObj) return false;

    const matches =
      playedUci === expectedUci ||
      (expectedUci.length === 4 && playedBase === expectedUci);

    if (!matches) {
      playChessSound('illegal', settings.soundEnabled);
      const nextAttempts = attemptsThisPuzzle + 1;
      setAttemptsThisPuzzle(nextAttempts);
      setStatusMsg({
        type: 'err',
        text: `${moveObj.san} is not the sharpest continuation. Look closer or toggle Hint.`,
      });
      onRecordProgress({
        id: `prog_${activePuzzle.id}`,
        puzzleId: activePuzzle.id,
        category: activePuzzle.category,
        difficulty: activePuzzle.difficulty,
        solved: solvedMap.get(activePuzzle.id)?.solved || false,
        attempts: (solvedMap.get(activePuzzle.id)?.attempts || 0) + 1,
        updatedAtMs: Date.now(),
      });
      return false;
    }

    // Correct player move
    chessRef.current = testChess;
    setFen(testChess.fen());
    setLastMove({ from: moveObj.from, to: moveObj.to });
    playChessSound(moveObj.isCapture() ? 'capture' : 'move', settings.soundEnabled);

    const nextStep = stepIdx + 1;
    if (nextStep >= activePuzzle.solutionUci.length) {
      playChessSound('gameover', settings.soundEnabled);
      setStepIdx(nextStep);
      setStatusMsg({ type: 'done', text: `Solved! ${activePuzzle.explanation}` });
      onRecordProgress({
        id: `prog_${activePuzzle.id}`,
        puzzleId: activePuzzle.id,
        category: activePuzzle.category,
        difficulty: activePuzzle.difficulty,
        solved: true,
        attempts: (solvedMap.get(activePuzzle.id)?.attempts || 0) + 1,
        updatedAtMs: Date.now(),
      });
      return true;
    }

    // Play opponent's forced reply automatically
    setStepIdx(nextStep);
    setStatusMsg({ type: 'ok', text: `Correct (${moveObj.san})! Keep going...` });

    const replyUci = activePuzzle.solutionUci[nextStep];
    setTimeout(() => {
      try {
        const reply = chessRef.current.move({
          from: replyUci.slice(0, 2),
          to: replyUci.slice(2, 4),
          promotion: (replyUci[4] as 'q' | 'r' | 'b' | 'n') || 'q',
        });
        if (reply) {
          setFen(chessRef.current.fen());
          setLastMove({ from: reply.from, to: reply.to });
          setStepIdx(nextStep + 1);
          playChessSound('move', settings.soundEnabled);
        }
      } catch {
        // ignore
      }
    }, 360);

    return true;
  };

  const handleEndgameMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (endgameAiThinking || chessRef.current.isGameOver()) return false;
    if (chessRef.current.turn() !== activeEndgame.sideToPlay) return false;

    try {
      const move = chessRef.current.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;
      setFen(chessRef.current.fen());
      setLastMove({ from: move.from, to: move.to });

      if (chessRef.current.isCheckmate()) {
        playChessSound('gameover', settings.soundEnabled);
        setStatusMsg({ type: 'done', text: 'Checkmate achieved! Endgame mastered.' });
        onRecordProgress({
          id: `prog_${activeEndgame.id}`,
          puzzleId: activeEndgame.id,
          category: 'endgame',
          difficulty: activeEndgame.difficulty,
          solved: true,
          attempts: (solvedMap.get(activeEndgame.id)?.attempts || 0) + 1,
          updatedAtMs: Date.now(),
        });
        return true;
      }

      if (chessRef.current.isDraw()) {
        playChessSound('gameover', settings.soundEnabled);
        const success = activeEndgame.goal === 'draw';
        setStatusMsg({
          type: success ? 'done' : 'err',
          text: success
            ? 'Draw secured! You held the theoretical endgame.'
            : 'Game ended in a draw, but this endgame is winning. Reset to retry.',
        });
        if (success) {
          onRecordProgress({
            id: `prog_${activeEndgame.id}`,
            puzzleId: activeEndgame.id,
            category: 'endgame',
            difficulty: activeEndgame.difficulty,
            solved: true,
            attempts: (solvedMap.get(activeEndgame.id)?.attempts || 0) + 1,
            updatedAtMs: Date.now(),
          });
        }
        return true;
      }

      playChessSound(move.isCapture() ? 'capture' : 'move', settings.soundEnabled);
      setEndgameAiThinking(true);
      const snapshotFen = chessRef.current.fen();

      stockfishService
        .evaluateSinglePosition(snapshotFen, { depth: 12, skillLevel: 18, movetime: 450 })
        .then(({ bestMove }) => {
          if (!bestMove || chessRef.current.fen() !== snapshotFen) return;
          const aiMove = chessRef.current.move({
            from: bestMove.slice(0, 2),
            to: bestMove.slice(2, 4),
            promotion: (bestMove[4] as 'q' | 'r' | 'b' | 'n') || 'q',
          });
          if (aiMove) {
            setFen(chessRef.current.fen());
            setLastMove({ from: aiMove.from, to: aiMove.to });
            if (chessRef.current.isCheckmate()) {
              setStatusMsg({ type: 'err', text: 'Stockfish delivered checkmate. Reset to try again.' });
            } else if (chessRef.current.isDraw()) {
              const ok = activeEndgame.goal === 'draw';
              setStatusMsg({
                type: ok ? 'done' : 'err',
                text: ok ? 'Draw secured against Stockfish!' : 'Drawn — try pushing for the win!',
              });
            }
          }
        })
        .finally(() => setEndgameAiThinking(false));

      return true;
    } catch {
      return false;
    }
  };

  const resetCurrentExercise = () => {
    const targetFen = mode === 'puzzles' ? activePuzzle.fen : activeEndgame.fen;
    chessRef.current = new Chess(targetFen);
    setFen(targetFen);
    setStepIdx(0);
    setLastMove(null);
    setShowHint(false);
    setStatusMsg({
      type: 'idle',
      text: mode === 'puzzles' ? activePuzzle.theme : activeEndgame.instructions,
    });
  };

  const sideToMove = chessRef.current.turn();

  return (
    <div className="space-y-6">
      {/* Progress & Filter Strip */}
      <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-500">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {mode === 'puzzles' ? 'Tactical & Checkmate Training' : 'Master Endgame Practice'}
            </h2>
            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
              {stats.solvedCount}/{stats.total} completed · {stats.totalAttempts} total attempts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'puzzles' && (
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as 'all' | TrainingCategory);
                setPuzzleIndex(0);
              }}
              className="rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200"
            >
              <option value="all">All Categories</option>
              <option value="tactics">Tactics</option>
              <option value="checkmate">Checkmates</option>
              <option value="opening">Opening Traps</option>
            </select>
          )}

          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value as 'all' | TrainingDifficulty);
              setPuzzleIndex(0);
              setEndgameIndex(0);
            }}
            className="rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="master">Master</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-3">
          <InteractiveBoard
            fen={fen}
            orientation={mode === 'puzzles' ? new Chess(activePuzzle.fen).turn() : activeEndgame.sideToPlay}
            boardTheme={settings.boardTheme}
            pieceStyle={settings.pieceStyle}
            showCoordinates={settings.showCoordinates}
            allowedColor={mode === 'puzzles' ? new Chess(activePuzzle.fen).turn() : activeEndgame.sideToPlay}
            lastMove={lastMove}
            onMove={mode === 'puzzles' ? handlePuzzleMove : handleEndgameMove}
          />
        </div>

        <div className="xl:col-span-5 space-y-4">
          <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-3">
            {mode === 'puzzles' ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {activePuzzle.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                      {activePuzzle.category} · {activePuzzle.difficulty} · Rating {activePuzzle.rating}
                    </p>
                  </div>
                  {solvedMap.get(activePuzzle.id)?.solved && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>

                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed border ${
                    statusMsg.type === 'done'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                      : statusMsg.type === 'err'
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-neutral-50 dark:bg-[#121417] border-neutral-200 dark:border-[#262B33] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {statusMsg.text}
                </div>

                {showHint && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5">
                    Hint: {activePuzzle.hint}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer hover:border-emerald-500/40"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> {showHint ? 'Hide Hint' : 'Hint'}
                  </button>
                  <button
                    type="button"
                    onClick={resetCurrentExercise}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer hover:border-emerald-500/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInAnalyser(fen)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer hover:border-emerald-500/40"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Analyse
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {activeEndgame.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                      Goal: {activeEndgame.goal === 'win' ? 'Win' : 'Hold Draw'} as{' '}
                      {activeEndgame.sideToPlay === 'w' ? 'White' : 'Black'} · {activeEndgame.difficulty}
                    </p>
                  </div>
                  {solvedMap.get(activeEndgame.id)?.solved && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>

                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Key Concept: {activeEndgame.keyConcept}
                </p>

                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed border ${
                    statusMsg.type === 'done'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                      : statusMsg.type === 'err'
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-neutral-50 dark:bg-[#121417] border-neutral-200 dark:border-[#262B33] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {endgameAiThinking
                    ? 'Stockfish defending endgame...'
                    : `${sideToMove === 'w' ? 'White' : 'Black'} to move · ${statusMsg.text}`}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetCurrentExercise}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Endgame
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInAnalyser(fen)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Inspect in Engine
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Exercise Selector List */}
          <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-4 space-y-2">
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {mode === 'puzzles' ? 'Puzzle Queue' : 'Endgame Curriculum'}
            </h4>
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#262B33]">
              {(mode === 'puzzles' ? filteredPuzzles : filteredEndgames).map((item, idx) => {
                const active =
                  mode === 'puzzles' ? idx === puzzleIndex : idx === endgameIndex;
                const done = solvedMap.get(item.id)?.solved;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      mode === 'puzzles' ? setPuzzleIndex(idx) : setEndgameIndex(idx)
                    }
                    className={`w-full py-2.5 px-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                        : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate">{item.title}</p>
                      <p className="text-[11px] text-neutral-500 capitalize">
                        {item.difficulty}
                        {'rating' in item ? ` · ${item.rating}` : ` · ${item.goal}`}
                      </p>
                    </div>
                    {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
