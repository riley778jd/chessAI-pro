import { Chess } from 'chess.js';
import type { MoveClassification } from '../types/chess';

const PIECE_VALUES: Record<'p' | 'n' | 'b' | 'r' | 'q', number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

const STARTING_COUNTS: Record<'p' | 'n' | 'b' | 'r' | 'q', number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

export interface MaterialInfo {
  whitePoints: number;
  blackPoints: number;
  diff: number; // positive = White ahead
  capturedByWhite: ('p' | 'n' | 'b' | 'r' | 'q')[];
  capturedByBlack: ('p' | 'n' | 'b' | 'r' | 'q')[];
  summary: string;
}

export function computeMaterialBalance(fen: string): MaterialInfo {
  const counts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  try {
    const chess = new Chess(fen, { skipValidation: true });
    const board = chess.board();
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type !== 'k') {
          counts[sq.color][sq.type] += 1;
        }
      }
    }
  } catch {
    // fallback default
  }

  let whitePoints = 0;
  let blackPoints = 0;
  const capturedByWhite: ('p' | 'n' | 'b' | 'r' | 'q')[] = [];
  const capturedByBlack: ('p' | 'n' | 'b' | 'r' | 'q')[] = [];

  (['q', 'r', 'b', 'n', 'p'] as const).forEach((piece) => {
    whitePoints += counts.w[piece] * PIECE_VALUES[piece];
    blackPoints += counts.b[piece] * PIECE_VALUES[piece];

    const missingBlack = Math.max(0, STARTING_COUNTS[piece] - counts.b[piece]);
    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(piece);

    const missingWhite = Math.max(0, STARTING_COUNTS[piece] - counts.w[piece]);
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(piece);
  });

  const diff = whitePoints - blackPoints;
  let summary = 'Equal material';
  if (diff > 0) summary = `White +${diff} material (${whitePoints} vs ${blackPoints})`;
  else if (diff < 0) summary = `Black +${Math.abs(diff)} material (${blackPoints} vs ${whitePoints})`;

  return { whitePoints, blackPoints, diff, capturedByWhite, capturedByBlack, summary };
}

export function detectGamePhase(fen: string): 'Opening' | 'Middlegame' | 'Endgame' {
  try {
    const chess = new Chess(fen, { skipValidation: true });
    const fullMove = Number(fen.split(' ')[5]) || 1;
    let nonKingMaterial = 0;
    let queens = 0;
    for (const row of chess.board()) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        if (sq.type === 'q') queens += 1;
        if (sq.type !== 'p') nonKingMaterial += PIECE_VALUES[sq.type];
      }
    }
    if (nonKingMaterial <= 26 || (queens === 0 && nonKingMaterial <= 30)) {
      return 'Endgame';
    }
    if (fullMove <= 12 && nonKingMaterial >= 54) {
      return 'Opening';
    }
    return 'Middlegame';
  } catch {
    return 'Middlegame';
  }
}

export function formatEvalScore(cp?: number, mate?: number): string {
  if (typeof mate === 'number') {
    return mate > 0 ? `#${mate}` : `-#${Math.abs(mate)}`;
  }
  if (typeof cp === 'number') {
    const pawns = cp / 100;
    const sign = pawns > 0.04 ? '+' : '';
    return `${sign}${pawns.toFixed(2)}`;
  }
  return '0.00';
}

export function normalizeEvalForBar(cp?: number, mate?: number): number {
  if (typeof mate === 'number') {
    return mate > 0 ? 10 : -10;
  }
  if (typeof cp === 'number') {
    return Math.max(-10, Math.min(10, cp / 100));
  }
  return 0;
}

export function evalToWhiteWinPercent(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function moveAccuracyFromWinLoss(winLoss: number): number {
  if (winLoss <= 0) return 100;
  const raw = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669;
  return Math.max(0, Math.min(100, Number(raw.toFixed(1))));
}

export function classifyMoveFromEval(
  cpLoss: number,
  winLoss: number,
  playedUci: string,
  bestUci: string,
  isSacrifice = false
): MoveClassification {
  if (playedUci === bestUci || cpLoss <= 5) {
    if (isSacrifice && cpLoss <= 15) return 'brilliant';
    return 'best';
  }
  if (winLoss <= 1.8 && cpLoss <= 22) {
    return 'great';
  }
  if (winLoss <= 5 && cpLoss <= 55) {
    return 'good';
  }
  if (winLoss <= 10 && cpLoss <= 115) {
    return 'inaccuracy';
  }
  if (winLoss <= 20 && cpLoss <= 240) {
    return 'mistake';
  }
  return 'blunder';
}

export function uciLineToSan(fen: string, pvUci: string[]): string[] {
  const result: string[] = [];
  try {
    const chess = new Chess(fen);
    for (const uci of pvUci) {
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const move = chess.move({ from, to, promotion });
      if (!move) break;
      result.push(move.san);
    }
  } catch {
    // stop if invalid sequence
  }
  return result;
}

export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (clamped < 20000 && clamped > 0) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function isValidMoveFormat(uci: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci);
}
