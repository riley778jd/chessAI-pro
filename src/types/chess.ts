export type NavSection =
  | 'dashboard'
  | 'analyse'
  | 'review'
  | 'play'
  | 'openings'
  | 'training'
  | 'endgames'
  | 'editor'
  | 'saved'
  | 'coach'
  | 'settings';

export type BoardThemeId = 'emerald' | 'tournament' | 'walnut' | 'cobalt' | 'marble';
export type PieceStyleId = 'staunton' | 'neo' | 'editorial' | 'mono';

export interface EngineLine {
  multipv: number;
  depth: number;
  seldepth: number;
  cp?: number;
  mate?: number;
  nodes: number;
  nps: number;
  time: number;
  pvUci: string[];
  pvSan: string[];
  evalLabel: string;
  normalizedScore: number; // White perspective in pawns, clamped [-10, 10]
}

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface ReviewedMove {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  bestMoveUci: string;
  bestMoveSan: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  evalBeforeLabel: string;
  evalAfterLabel: string;
  cpLoss: number;
  accuracy: number;
  classification: MoveClassification;
}

export interface GameReport {
  summary: string;
  whiteStrengths: string[];
  whiteWeaknesses: string[];
  blackStrengths: string[];
  blackWeaknesses: string[];
  keyTurningPoints: string[];
  trainingRecommendations: string[];
}

export interface GameReviewResult {
  pgn: string;
  white: string;
  black: string;
  result: string;
  eco: string;
  openingName: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  moves: ReviewedMove[];
  counts: {
    w: Record<MoveClassification, number>;
    b: Record<MoveClassification, number>;
  };
}

export interface SavedGameRecord {
  id: string;
  title: string;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  eco: string;
  openingName: string;
  pgn: string;
  initialFen: string;
  mode: 'analysis' | 'ai_game' | 'review';
  accuracyWhite?: number;
  accuracyBlack?: number;
  createdAtMs: number;
  updatedAtMs: number;
  synced?: boolean;
}

export interface AnalysisHistoryRecord {
  id: string;
  fen: string;
  depth: number;
  bestMove: string;
  evalDisplay: string;
  topLines: string[];
  coachSummary: string;
  createdAtMs: number;
  synced?: boolean;
}

export type TrainingCategory = 'tactics' | 'checkmate' | 'opening' | 'endgame';
export type TrainingDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface TrainingPuzzle {
  id: string;
  title: string;
  category: TrainingCategory;
  difficulty: TrainingDifficulty;
  rating: number;
  fen: string;
  solutionUci: string[]; // Sequence of alternating player/opponent moves
  theme: string;
  hint: string;
  explanation: string;
}

export interface EndgameExercise {
  id: string;
  title: string;
  difficulty: TrainingDifficulty;
  fen: string;
  goal: 'win' | 'draw';
  sideToPlay: 'w' | 'b';
  keyConcept: string;
  instructions: string;
}

export interface TrainingProgressRecord {
  id: string;
  puzzleId: string;
  category: TrainingCategory;
  difficulty: TrainingDifficulty;
  solved: boolean;
  attempts: number;
  updatedAtMs: number;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  engineDepth: number;
  multiPv: number;
  engineHashMb: number;
  soundEnabled: boolean;
  showCoordinates: boolean;
  showEvalBar: boolean;
  autoAnalyze: boolean;
}

export interface CoachChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  fen?: string;
  timestamp: number;
}
