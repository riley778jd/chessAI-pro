export interface OpeningContinuation {
  san: string;
  uci: string;
  eco: string;
  name: string;
  whiteWins: number;
  draws: number;
  blackWins: number;
  totalGames: number;
  note?: string;
}

export interface OpeningNode {
  eco: string;
  name: string;
  description: string;
  keyIdeas: string[];
  continuations: OpeningContinuation[];
}

interface EcoLineEntry {
  moves: string[];
  eco: string;
  name: string;
}

// Comprehensive ECO classification table for instant position identification
export const ECO_LINES: EcoLineEntry[] = [
  { moves: ['e4'], eco: 'B00', name: "King's Pawn Opening" },
  { moves: ['e4', 'e5'], eco: 'C20', name: "King's Pawn Game" },
  { moves: ['e4', 'e5', 'Nf3'], eco: 'C40', name: "King's Knight Opening" },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6'], eco: 'C44', name: "King's Knight Game" },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], eco: 'C60', name: 'Ruy Lopez (Spanish Opening)' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], eco: 'C70', name: 'Ruy Lopez: Morphy Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'], eco: 'C78', name: 'Ruy Lopez: Closed Variation' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], eco: 'C84', name: 'Ruy Lopez: Closed, Main Line' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], eco: 'C65', name: 'Ruy Lopez: Berlin Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], eco: 'C50', name: 'Italian Game' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], eco: 'C50', name: 'Italian Game: Giuoco Piano' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'], eco: 'C53', name: 'Italian Game: Giuoco Piano Main Line' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], eco: 'C55', name: 'Italian Game: Two Knights Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], eco: 'C44', name: 'Scotch Game' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], eco: 'C42', name: 'Petrov Defense (Russian Game)' },
  { moves: ['e4', 'c5'], eco: 'B20', name: 'Sicilian Defense' },
  { moves: ['e4', 'c5', 'Nf3'], eco: 'B27', name: 'Sicilian Defense: Open Preparation' },
  { moves: ['e4', 'c5', 'Nf3', 'd6'], eco: 'B50', name: 'Sicilian Defense: Modern Variation' },
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'], eco: 'B70', name: 'Sicilian Defense: Dragon Variation' },
  { moves: ['e4', 'c5', 'Nf3', 'Nc6'], eco: 'B30', name: 'Sicilian Defense: Old Sicilian' },
  { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'], eco: 'B30', name: 'Sicilian Defense: Rossolimo Attack' },
  { moves: ['e4', 'c5', 'Nf3', 'e6'], eco: 'B40', name: 'Sicilian Defense: French Variation' },
  { moves: ['e4', 'c5', 'c3'], eco: 'B22', name: 'Sicilian Defense: Alapin Variation' },
  { moves: ['e4', 'e6'], eco: 'C00', name: 'French Defense' },
  { moves: ['e4', 'e6', 'd4', 'd5'], eco: 'C00', name: 'French Defense: Main Line' },
  { moves: ['e4', 'e6', 'd4', 'd5', 'Nc3'], eco: 'C10', name: 'French Defense: Classical / Winawer' },
  { moves: ['e4', 'e6', 'd4', 'd5', 'Nd2'], eco: 'C03', name: 'French Defense: Tarrasch Variation' },
  { moves: ['e4', 'e6', 'd4', 'd5', 'e5'], eco: 'C02', name: 'French Defense: Advance Variation' },
  { moves: ['e4', 'c6'], eco: 'B10', name: 'Caro-Kann Defense' },
  { moves: ['e4', 'c6', 'd4', 'd5'], eco: 'B12', name: 'Caro-Kann Defense: Main Line' },
  { moves: ['e4', 'c6', 'd4', 'd5', 'Nc3'], eco: 'B18', name: 'Caro-Kann Defense: Classical' },
  { moves: ['e4', 'c6', 'd4', 'd5', 'e5'], eco: 'B12', name: 'Caro-Kann Defense: Advance Variation' },
  { moves: ['e4', 'd5'], eco: 'B01', name: 'Scandinavian Defense' },
  { moves: ['e4', 'd6'], eco: 'B07', name: 'Pirc Defense' },
  { moves: ['d4'], eco: 'A40', name: "Queen's Pawn Opening" },
  { moves: ['d4', 'd5'], eco: 'D00', name: "Queen's Pawn Game" },
  { moves: ['d4', 'd5', 'c4'], eco: 'D06', name: "Queen's Gambit" },
  { moves: ['d4', 'd5', 'c4', 'e6'], eco: 'D30', name: "Queen's Gambit Declined" },
  { moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'], eco: 'D35', name: "Queen's Gambit Declined: Orthodox" },
  { moves: ['d4', 'd5', 'c4', 'c6'], eco: 'D10', name: 'Slav Defense' },
  { moves: ['d4', 'd5', 'c4', 'dxc4'], eco: 'D20', name: "Queen's Gambit Accepted" },
  { moves: ['d4', 'd5', 'Bf4'], eco: 'D02', name: 'London System' },
  { moves: ['d4', 'Nf6'], eco: 'A45', name: 'Indian Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'e6'], eco: 'E00', name: 'Indian Defense: East Indian' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], eco: 'E20', name: 'Nimzo-Indian Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], eco: 'E12', name: "Queen's Indian Defense" },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'], eco: 'E01', name: 'Catalan Opening' },
  { moves: ['d4', 'Nf6', 'c4', 'g6'], eco: 'E60', name: "King's Indian Defense" },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], eco: 'E60', name: "King's Indian Defense: Fianchetto / Main" },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], eco: 'D80', name: 'Grünfeld Defense' },
  { moves: ['c4'], eco: 'A10', name: 'English Opening' },
  { moves: ['c4', 'e5'], eco: 'A20', name: 'English Opening: Reversed Sicilian' },
  { moves: ['c4', 'c5'], eco: 'A30', name: 'English Opening: Symmetrical Variation' },
  { moves: ['Nf3'], eco: 'A04', name: 'Réti Opening' },
  { moves: ['Nf3', 'd5'], eco: 'A06', name: 'Réti Opening: Main Line' },
];

export function detectOpeningFromMoves(sanMoves: string[]): { eco: string; name: string } {
  if (sanMoves.length === 0) {
    return { eco: 'A00', name: 'Starting Position' };
  }
  let bestMatch: { eco: string; name: string } = { eco: 'A00', name: 'Unclassified Opening' };
  let bestLen = 0;
  for (const entry of ECO_LINES) {
    if (entry.moves.length <= sanMoves.length && entry.moves.length > bestLen) {
      let matches = true;
      for (let i = 0; i < entry.moves.length; i++) {
        if (entry.moves[i] !== sanMoves[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        bestMatch = { eco: entry.eco, name: entry.name };
        bestLen = entry.moves.length;
      }
    }
  }
  return bestMatch;
}

// Local Opening Explorer Tree keyed by space-separated SAN sequence ("" = root)
export const LOCAL_OPENING_TREE: Record<string, OpeningNode> = {
  '': {
    eco: 'A00',
    name: 'Starting Position',
    description: 'Standard chess starting array. White initiates with central space or flank hypermodern control.',
    keyIdeas: [
      'Control central squares (d4, e4, d5, e5) with pawns or pieces.',
      'Develop minor pieces toward the center before launching early queen raids.',
      'Castle early to safeguard the king and connect rooks.',
    ],
    continuations: [
      { san: 'e4', uci: 'e2e4', eco: 'B00', name: "King's Pawn Opening", whiteWins: 38, draws: 34, blackWins: 28, totalGames: 1420000, note: 'Sharp, open tactical play' },
      { san: 'd4', uci: 'd2d4', eco: 'A40', name: "Queen's Pawn Opening", whiteWins: 37, draws: 38, blackWins: 25, totalGames: 1180000, note: 'Strategic, structural control' },
      { san: 'c4', uci: 'c2c4', eco: 'A10', name: 'English Opening', whiteWins: 36, draws: 39, blackWins: 25, totalGames: 310000, note: 'Flexible flank control over d5' },
      { san: 'Nf3', uci: 'g1f3', eco: 'A04', name: 'Réti Opening', whiteWins: 36, draws: 40, blackWins: 24, totalGames: 295000, note: 'Hypermodern flexible setup' },
    ],
  },
  'e4': {
    eco: 'B00',
    name: "King's Pawn Opening",
    description: 'White claims e4 and opens diagonals for the queen and light-squared bishop.',
    keyIdeas: [
      'Prepare d4 to build a full pawn center.',
      'Develop Nf3 and Bc4/Bb5 quickly.',
      'Watch Black’s asymmetrical Sicilian (1...c5) or solid 1...e5 responses.',
    ],
    continuations: [
      { san: 'c5', uci: 'c7c5', eco: 'B20', name: 'Sicilian Defense', whiteWins: 34, draws: 34, blackWins: 32, totalGames: 620000, note: 'Asymmetric, fighting counterattack' },
      { san: 'e5', uci: 'e7e5', eco: 'C20', name: "King's Pawn Game", whiteWins: 36, draws: 39, blackWins: 25, totalGames: 385000, note: 'Classical central symmetry' },
      { san: 'e6', uci: 'e7e6', eco: 'C00', name: 'French Defense', whiteWins: 37, draws: 36, blackWins: 27, totalGames: 185000, note: 'Solid d5 counter-thrust' },
      { san: 'c6', uci: 'c7c6', eco: 'B10', name: 'Caro-Kann Defense', whiteWins: 36, draws: 39, blackWins: 25, totalGames: 155000, note: 'Resilient structure, free light bishop' },
    ],
  },
  'e4 e5': {
    eco: 'C20',
    name: "King's Pawn Game",
    description: 'Symmetrical classical opening leading to rich piece play in the center.',
    keyIdeas: [
      'Attack e5 immediately with 2. Nf3.',
      'Rapidly contest the d4 break.',
    ],
    continuations: [
      { san: 'Nf3', uci: 'g1f3', eco: 'C40', name: "King's Knight Opening", whiteWins: 37, draws: 39, blackWins: 24, totalGames: 340000, note: 'Main classical line' },
      { san: 'Bc4', uci: 'f1c4', eco: 'C23', name: "Bishop's Opening", whiteWins: 35, draws: 37, blackWins: 28, totalGames: 22000, note: 'Avoids Petrov Defense' },
      { san: 'Nc3', uci: 'b1c3', eco: 'C25', name: 'Vienna Game', whiteWins: 36, draws: 34, blackWins: 30, totalGames: 18500, note: 'Prepares f4 thrust' },
    ],
  },
  'e4 e5 Nf3': {
    eco: 'C40',
    name: "King's Knight Opening",
    description: 'White develops with tempo against the e5 pawn.',
    keyIdeas: [
      'Black typically defends e5 with 2...Nc6 or counterattacks e4 with 2...Nf6.',
    ],
    continuations: [
      { san: 'Nc6', uci: 'b8c6', eco: 'C44', name: "King's Knight Game", whiteWins: 37, draws: 38, blackWins: 25, totalGames: 275000, note: 'Leads to Ruy Lopez, Italian, Scotch' },
      { san: 'Nf6', uci: 'g8f6', eco: 'C42', name: 'Petrov Defense', whiteWins: 30, draws: 52, blackWins: 18, totalGames: 56000, note: 'Ultra-solid Grandmaster drawing weapon' },
    ],
  },
  'e4 e5 Nf3 Nc6': {
    eco: 'C44',
    name: "King's Knight Game",
    description: 'The crossroads of classical 1.e4 e5 chess.',
    keyIdeas: [
      '3. Bb5 pressures the defender of e5 (Ruy Lopez).',
      '3. Bc4 targets f7 and prepares c3-d4 (Italian Game).',
      '3. d4 opens the center immediately (Scotch Game).',
    ],
    continuations: [
      { san: 'Bb5', uci: 'f1b5', eco: 'C60', name: 'Ruy Lopez', whiteWins: 37, draws: 42, blackWins: 21, totalGames: 168000, note: 'Long-term strategic pressure' },
      { san: 'Bc4', uci: 'f1c4', eco: 'C50', name: 'Italian Game', whiteWins: 36, draws: 38, blackWins: 26, totalGames: 64000, note: 'Direct f7 and central play' },
      { san: 'd4', uci: 'd2d4', eco: 'C44', name: 'Scotch Game', whiteWins: 37, draws: 38, blackWins: 25, totalGames: 34000, note: 'Immediate open center' },
    ],
  },
  'e4 e5 Nf3 Nc6 Bb5': {
    eco: 'C60',
    name: 'Ruy Lopez (Spanish Opening)',
    description: 'One of the deepest openings in chess, creating sustained tension against Black’s center.',
    keyIdeas: [
      '3...a6 forces the bishop to declare intentions while creating b5 expansion potential.',
      '3...Nf6 enters the notoriously solid Berlin Endgame.',
    ],
    continuations: [
      { san: 'a6', uci: 'a7a6', eco: 'C70', name: 'Morphy Defense', whiteWins: 37, draws: 41, blackWins: 22, totalGames: 120000, note: 'Most popular at all levels' },
      { san: 'Nf6', uci: 'g8f6', eco: 'C65', name: 'Berlin Defense', whiteWins: 30, draws: 53, blackWins: 17, totalGames: 36000, note: 'Elite endgame fortress' },
    ],
  },
  'e4 c5': {
    eco: 'B20',
    name: 'Sicilian Defense',
    description: 'Black fights asymmetrically for the d4 square and queenside counterplay along the c-file.',
    keyIdeas: [
      'White usually plays 2. Nf3 and 3. d4 for an Open Sicilian lead in development.',
      'Black aims for ...cxd4, control of c-file, and ...d5 or ...e5 central breaks.',
    ],
    continuations: [
      { san: 'Nf3', uci: 'g1f3', eco: 'B27', name: 'Open Sicilian Preparation', whiteWins: 36, draws: 35, blackWins: 29, totalGames: 480000, note: 'Main line toward Najdorf/Dragon/Sveshnikov' },
      { san: 'c3', uci: 'c2c3', eco: 'B22', name: 'Alapin Variation', whiteWins: 35, draws: 38, blackWins: 27, totalGames: 54000, note: 'Aims for strong d4 pawn center' },
      { san: 'Nc3', uci: 'b1c3', eco: 'B23', name: 'Closed Sicilian', whiteWins: 35, draws: 34, blackWins: 31, totalGames: 42000, note: 'Kingside pawn storm plans' },
    ],
  },
  'e4 c5 Nf3': {
    eco: 'B27',
    name: 'Sicilian Defense: Open Prep',
    description: 'Black selects between three major pawn/piece structures.',
    keyIdeas: ['2...d6 prepares the Najdorf or Dragon; 2...Nc6 allows Rossolimo or Sveshnikov; 2...e6 aims for Kan/Taimanov.'],
    continuations: [
      { san: 'd6', uci: 'd7d6', eco: 'B50', name: 'Sicilian Modern (Najdorf/Dragon)', whiteWins: 37, draws: 35, blackWins: 28, totalGames: 215000, note: 'Controls e5, most dynamic' },
      { san: 'Nc6', uci: 'b8c6', eco: 'B30', name: 'Old Sicilian / Rossolimo', whiteWins: 35, draws: 37, blackWins: 28, totalGames: 155000, note: 'Flexible knight development' },
      { san: 'e6', uci: 'e7e6', eco: 'B40', name: 'French Sicilian (Taimanov/Kan)', whiteWins: 36, draws: 35, blackWins: 29, totalGames: 98000, note: 'Flexible pawn structure' },
    ],
  },
  'd4': {
    eco: 'A40',
    name: "Queen's Pawn Opening",
    description: 'Solid central advance backed immediately by the queen, leading to rich strategic battles.',
    keyIdeas: [
      'Follow up with 2. c4 to challenge d5 or prevent ...c5.',
      'Or choose 2. Bf4 for the structured London System.',
    ],
    continuations: [
      { san: 'Nf6', uci: 'g8f6', eco: 'A45', name: 'Indian Defense', whiteWins: 36, draws: 39, blackWins: 25, totalGames: 640000, note: 'Prevents e4 immediately' },
      { san: 'd5', uci: 'd7d5', eco: 'D00', name: "Closed Queen's Pawn Game", whiteWins: 37, draws: 40, blackWins: 23, totalGames: 380000, note: 'Classical central stake' },
      { san: 'e6', uci: 'e7e6', eco: 'A40', name: 'Horwitz Defense', whiteWins: 38, draws: 36, blackWins: 26, totalGames: 72000, note: 'Transposes to QGD or French' },
    ],
  },
  'd4 d5': {
    eco: 'D00',
    name: "Queen's Pawn Game",
    description: 'Symmetrical d-pawn anchor preventing immediate e4.',
    keyIdeas: ['2. c4 offers the Queen’s Gambit to undermine d5 and gain central space.'],
    continuations: [
      { san: 'c4', uci: 'c2c4', eco: 'D06', name: "Queen's Gambit", whiteWins: 38, draws: 40, blackWins: 22, totalGames: 290000, note: 'Premier positional weapon' },
      { san: 'Bf4', uci: 'c1f4', eco: 'D02', name: 'London System', whiteWins: 35, draws: 38, blackWins: 27, totalGames: 48000, note: 'Solid pyramid setup' },
      { san: 'Nf3', uci: 'g1f3', eco: 'D02', name: 'Zukertort / Colle', whiteWins: 36, draws: 40, blackWins: 24, totalGames: 39000, note: 'Flexible development' },
    ],
  },
  'd4 d5 c4': {
    eco: 'D06',
    name: "Queen's Gambit",
    description: 'White challenges Black’s d5 pawn from the flank to secure a central majority.',
    keyIdeas: [
      'Black defends d5 with 2...e6 (QGD) or 2...c6 (Slav), or captures 2...dxc4 (QGA).',
    ],
    continuations: [
      { san: 'e6', uci: 'e7e6', eco: 'D30', name: "Queen's Gambit Declined", whiteWins: 37, draws: 43, blackWins: 20, totalGames: 135000, note: 'Classical fortress' },
      { san: 'c6', uci: 'c7c6', eco: 'D10', name: 'Slav Defense', whiteWins: 36, draws: 41, blackWins: 23, totalGames: 98000, note: 'Keeps c8 bishop free' },
      { san: 'dxc4', uci: 'd5c4', eco: 'D20', name: "Queen's Gambit Accepted", whiteWins: 39, draws: 40, blackWins: 21, totalGames: 42000, note: 'Active piece play for Black' },
    ],
  },
  'd4 Nf6': {
    eco: 'A45',
    name: 'Indian Defense',
    description: 'Hypermodern knight development controlling e4 and d5 before committing pawns.',
    keyIdeas: ['2. c4 expands on the queenside while keeping Nc3 and Nf3 options open.'],
    continuations: [
      { san: 'c4', uci: 'c2c4', eco: 'A50', name: 'Indian Game: 2.c4', whiteWins: 36, draws: 40, blackWins: 24, totalGames: 560000, note: 'Main line into Nimzo/KID/Grünfeld' },
      { san: 'Nf3', uci: 'g1f3', eco: 'A46', name: 'Torre / London', whiteWins: 35, draws: 40, blackWins: 25, totalGames: 58000, note: 'Avoids Benoni & Nimzo' },
      { san: 'Bf4', uci: 'c1f4', eco: 'A45', name: 'London System vs Nf6', whiteWins: 35, draws: 38, blackWins: 27, totalGames: 34000, note: 'Solid development' },
    ],
  },
  'd4 Nf6 c4': {
    eco: 'A50',
    name: 'Indian Defense: 2.c4',
    description: 'Black chooses between classical Nimzo/QGD setups (2...e6) or dynamic fianchetto systems (2...g6).',
    keyIdeas: ['2...e6 invites Nimzo-Indian or Catalan; 2...g6 prepares King’s Indian or Grünfeld.'],
    continuations: [
      { san: 'e6', uci: 'e7e6', eco: 'E00', name: 'East Indian / Nimzo Prep', whiteWins: 35, draws: 42, blackWins: 23, totalGames: 295000, note: 'Prepares ...Bb4 or ...d5' },
      { san: 'g6', uci: 'g7g6', eco: 'E60', name: "King's Indian / Grünfeld", whiteWins: 37, draws: 37, blackWins: 26, totalGames: 210000, note: 'Dynamic counterattacking setups' },
      { san: 'c5', uci: 'c7c5', eco: 'A56', name: 'Benoni / Benko Gambit', whiteWins: 39, draws: 34, blackWins: 27, totalGames: 32000, note: 'Sharp imbalanced structure' },
    ],
  },
};
