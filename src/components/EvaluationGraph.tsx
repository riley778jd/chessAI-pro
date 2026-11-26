import React from 'react';
import type { ReviewedMove } from '../types/chess';

interface EvaluationGraphProps {
  moves: ReviewedMove[];
  activePly: number;
  onSelectPly: (ply: number) => void;
}

export const EvaluationGraph: React.FC<EvaluationGraphProps> = ({
  moves,
  activePly,
  onSelectPly,
}) => {
  if (moves.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        Run Game Analysis to generate the evaluation graph.
      </div>
    );
  }

  const width = 640;
  const height = 140;
  const midY = height / 2;

  const clampCp = (cp: number) => Math.max(-800, Math.min(800, cp));
  const points = moves.map((m, idx) => {
    const x = moves.length === 1 ? width / 2 : (idx / (moves.length - 1)) * width;
    const norm = clampCp(m.evalAfterCp) / 800; // [-1, 1]
    const y = midY - norm * (midY - 8);
    return { x, y, move: m };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${midY} L ${points[0].x.toFixed(1)} ${midY} Z`;

  return (
    <div className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#171A20] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Evaluation Swing Graph
        </span>
        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
          {moves.length} plies · Click any point to inspect
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-32 cursor-pointer overflow-visible"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const idx = Math.round(relX * (moves.length - 1));
          if (moves[idx]) onSelectPly(moves[idx].ply);
        }}
      >
        <defs>
          <linearGradient id="evalAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1F242D" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1={midY}
          x2={width}
          y2={midY}
          stroke="currentColor"
          className="text-neutral-300 dark:text-neutral-700"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        <path d={areaPath} fill="url(#evalAreaGrad)" />
        <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2" />

        {points.map((p) => {
          const isBlunder = p.move.classification === 'blunder';
          const isMistake = p.move.classification === 'mistake';
          const isBrilliant = p.move.classification === 'brilliant';
          const isSelected = p.move.ply === activePly;

          if (!isBlunder && !isMistake && !isBrilliant && !isSelected) return null;

          const fill = isSelected
            ? '#FFFFFF'
            : isBlunder
            ? '#EF4444'
            : isMistake
            ? '#F59E0B'
            : '#06B6D4';

          return (
            <circle
              key={p.move.ply}
              cx={p.x}
              cy={p.y}
              r={isSelected ? 4.5 : 3.2}
              fill={fill}
              stroke="#121417"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
};
