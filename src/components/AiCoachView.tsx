import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Send, Sparkles } from 'lucide-react';
import { stockfishService } from '../engine/stockfishService';
import { computeMaterialBalance, detectGamePhase } from '../utils/chessHelpers';
import type { CoachChatMessage, EngineLine, UserSettings } from '../types/chess';
import { InteractiveBoard } from './InteractiveBoard';

interface AiCoachViewProps {
  settings: UserSettings;
  contextFen: string;
  contextLines: EngineLine[];
}

const COACH_PROMPTS = [
  { label: 'Explain Best Move', focus: 'best_move', text: 'Explain why Stockfish recommends the top move in this position and what follow-up plan it unlocks.' },
  { label: 'Spot Tactical Threats', focus: 'tactics', text: 'Identify immediate tactical opportunities, checks, pins, forks, or hidden defensive resources for both sides.' },
  { label: 'Positional Evaluation', focus: 'positional', text: 'Break down pawn structure, king safety, piece activity, and key outposts here.' },
  { label: 'Endgame Strategy', focus: 'endgame', text: 'What are the critical winning or drawing plans if pieces are traded into an endgame?' },
  { label: 'Personal Training Plan', focus: 'training', text: 'Based on this type of structure, what weaknesses should I watch for and what should I study next?' },
];

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  settings,
  contextFen,
  contextLines,
}) => {
  const [fen, setFen] = useState(contextFen || new Chess().fen());
  const [lines, setLines] = useState<EngineLine[]>(contextLines);
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (contextFen) setFen(contextFen);
  }, [contextFen]);

  useEffect(() => {
    if (contextLines.length > 0) {
      setLines(contextLines);
      return;
    }
    const cancel = stockfishService.analyzePosition(
      fen,
      { depth: 12, multiPv: 3, hashMb: settings.engineHashMb },
      (updated) => setLines(updated)
    );
    return () => cancel();
  }, [fen, contextLines, settings.engineHashMb]);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const material = useMemo(() => computeMaterialBalance(fen), [fen]);
  const phase = useMemo(() => detectGamePhase(fen), [fen]);

  const sendQuestion = async (questionText: string, focusArea = 'general') => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMsg: CoachChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      fen,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let activeLines = lines;
      if (activeLines.length === 0) {
        const res = await stockfishService.evaluateSinglePosition(fen, { depth: 12 });
        if (res.line) activeLines = [res.line];
        setLines(activeLines);
      }

      const resp = await fetch('/api/coach/explain-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          turn: chess.turn(),
          stockfishLines: activeLines,
          materialSummary: material.summary,
          gamePhase: phase,
          focusArea,
          question: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gemini AI Coach request failed.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          role: 'coach',
          text: data.answer,
          fen,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach AI Coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
    try {
      const next = new Chess(fen);
      const m = next.move({ from, to, promotion: promotion || 'q' });
      if (!m) return false;
      setFen(next.fen());
      setLines([]);
      return true;
    } catch {
      return false;
    }
  };

  const top = lines[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Live Board Synced with Stockfish */}
      <div className="xl:col-span-5 space-y-3">
        <InteractiveBoard
          fen={fen}
          boardTheme={settings.boardTheme}
          pieceStyle={settings.pieceStyle}
          showCoordinates={settings.showCoordinates}
          showEvalBar={settings.showEvalBar}
          evalScore={top?.normalizedScore ?? 0}
          evalLabel={top?.evalLabel ?? '0.0'}
          arrows={
            top?.pvUci[0]
              ? [{ from: top.pvUci[0].slice(0, 2), to: top.pvUci[0].slice(2, 4) }]
              : []
          }
          onMove={handleBoardMove}
        />
        <div className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="font-semibold text-emerald-500">
              Stockfish Top: {top ? `${top.evalLabel} (${top.pvSan[0] || ''})` : 'Analysing...'}
            </span>
            <span className="text-neutral-500">{phase}</span>
          </div>
          <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
            {lines.map((l) => `${l.evalLabel} ${l.pvSan.slice(0, 4).join(' ')}`).join('  |  ')}
          </p>
        </div>
      </div>

      {/* Right: Gemini Coaching Conversation */}
      <div className="xl:col-span-7 rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] flex flex-col min-h-[540px] max-h-[720px]">
        <div className="p-4 border-b border-neutral-200 dark:border-[#262B33] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Grandmaster AI Chess Coach
            </h2>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Grounded in live Stockfish UCI lines
          </span>
        </div>

        {/* Quick Prompts */}
        <div className="p-3 border-b border-neutral-100 dark:border-[#262B33] flex flex-wrap gap-1.5">
          {COACH_PROMPTS.map((p) => (
            <button
              key={p.focus}
              type="button"
              onClick={() => sendQuestion(p.text, p.focus)}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-2">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Ask anything about the position on the board
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Move pieces directly on the board to explore variations, then ask Gemini to explain tactical threats, positional imbalances, opening ideas, or endgame plans using verified Stockfish lines.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 dark:bg-[#121417] border border-neutral-200 dark:border-[#2A2F38] text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              AI Coach is reviewing Stockfish variations...
            </div>
          )}
          {errorMsg && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}
          className="p-3 border-t border-neutral-200 dark:border-[#262B33] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a candidate move, sacrifice, or plan..."
            className="flex-1 rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-neutral-50 dark:bg-[#121417] px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Ask
          </button>
        </form>
      </div>
    </div>
  );
};
