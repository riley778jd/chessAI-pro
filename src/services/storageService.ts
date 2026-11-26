import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AnalysisHistoryRecord,
  SavedGameRecord,
  TrainingProgressRecord,
  UserSettings,
} from '../types/chess';

const STORAGE_KEYS = {
  SETTINGS: 'chessai_pro_settings_v1',
  GAMES: 'chessai_pro_saved_games_v1',
  ANALYSES: 'chessai_pro_analysis_history_v1',
  TRAINING: 'chessai_pro_training_progress_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  boardTheme: 'emerald',
  pieceStyle: 'staunton',
  engineDepth: 14,
  multiPv: 3,
  engineHashMb: 32,
  soundEnabled: true,
  showCoordinates: true,
  showEvalBar: true,
  autoAnalyze: true,
};

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export function generateSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Local Storage Accessors
export function loadLocalSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

export function loadLocalGames(): SavedGameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAMES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalGames(games: SavedGameRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games.slice(0, 100)));
  } catch {
    // ignore
  }
}

export function loadLocalAnalyses(): AnalysisHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalAnalyses(records: AnalysisHistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(records.slice(0, 100)));
  } catch {
    // ignore
  }
}

export function loadLocalTraining(): TrainingProgressRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRAINING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalTraining(records: TrainingProgressRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRAINING, JSON.stringify(records.slice(0, 200)));
  } catch {
    // ignore
  }
}

// Firestore Cloud Sync Functions (Strict Schema & Error Handling)
export async function ensureCloudUserProfile(user: User, settings: UserSettings): Promise<UserSettings | null> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: (user.displayName || 'Chess Player').slice(0, 100),
        email: (user.email || 'user@chessai.pro').slice(0, 254),
        preferredTheme: settings.theme,
        boardTheme: settings.boardTheme,
        pieceStyle: settings.pieceStyle,
        engineDepth: Math.max(4, Math.min(24, Math.round(settings.engineDepth))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return settings;
    } else {
      const data = snap.data();
      return {
        ...settings,
        theme: data.preferredTheme === 'light' ? 'light' : 'dark',
        boardTheme: data.boardTheme || settings.boardTheme,
        pieceStyle: data.pieceStyle || settings.pieceStyle,
        engineDepth: typeof data.engineDepth === 'number' ? data.engineDepth : settings.engineDepth,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCloudUserPreferences(user: User, settings: UserSettings): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    await updateDoc(ref, {
      displayName: (user.displayName || 'Chess Player').slice(0, 100),
      preferredTheme: settings.theme,
      boardTheme: settings.boardTheme.slice(0, 40),
      pieceStyle: settings.pieceStyle.slice(0, 40),
      engineDepth: Math.max(4, Math.min(24, Math.round(settings.engineDepth))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncSavedGameToCloud(user: User, game: SavedGameRecord): Promise<void> {
  const safeId = sanitizeId(game.id);
  const path = `users/${user.uid}/games/${safeId}`;
  const ref = doc(db, 'users', user.uid, 'games', safeId);

  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: user.uid,
    title: game.title.slice(0, 140) || 'Untitled Game',
    white: game.white.slice(0, 80) || 'White',
    black: game.black.slice(0, 80) || 'Black',
    result: ['1-0', '0-1', '1/2-1/2', '*'].includes(game.result) ? game.result : '*',
    eco: (game.eco || 'A00').slice(0, 10),
    openingName: (game.openingName || 'Chess Game').slice(0, 120),
    pgn: game.pgn.slice(0, 20000),
    initialFen: game.initialFen.slice(0, 128),
    mode: game.mode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof game.accuracyWhite === 'number') {
    payload.accuracyWhite = Math.max(0, Math.min(100, game.accuracyWhite));
  }
  if (typeof game.accuracyBlack === 'number') {
    payload.accuracyBlack = Math.max(0, Math.min(100, game.accuracyBlack));
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchCloudGames(user: User): Promise<SavedGameRecord[]> {
  const path = `users/${user.uid}/games`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'games'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        title: data.title || 'Untitled Game',
        white: data.white || 'White',
        black: data.black || 'Black',
        result: data.result || '*',
        eco: data.eco || 'A00',
        openingName: data.openingName || 'Chess Game',
        pgn: data.pgn || '',
        initialFen: data.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        mode: data.mode || 'analysis',
        accuracyWhite: data.accuracyWhite,
        accuracyBlack: data.accuracyBlack,
        createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
        updatedAtMs: data.updatedAt?.toMillis?.() ?? Date.now(),
        synced: true,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteCloudGame(user: User, gameId: string): Promise<void> {
  const safeId = sanitizeId(gameId);
  const path = `users/${user.uid}/games/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'games', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncAnalysisToCloud(user: User, record: AnalysisHistoryRecord): Promise<void> {
  const safeId = sanitizeId(record.id);
  const path = `users/${user.uid}/analyses/${safeId}`;
  const ref = doc(db, 'users', user.uid, 'analyses', safeId);

  try {
    await setDoc(ref, {
      id: safeId,
      ownerId: user.uid,
      fen: record.fen.slice(0, 128),
      depth: Math.max(1, Math.min(30, Math.round(record.depth))),
      bestMove: record.bestMove.slice(0, 20),
      evalDisplay: record.evalDisplay.slice(0, 24),
      topLines: record.topLines.slice(0, 5).map((l) => l.slice(0, 250)),
      coachSummary: record.coachSummary.slice(0, 4000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchCloudAnalyses(user: User): Promise<AnalysisHistoryRecord[]> {
  const path = `users/${user.uid}/analyses`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'analyses'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        fen: data.fen,
        depth: data.depth,
        bestMove: data.bestMove,
        evalDisplay: data.evalDisplay,
        topLines: Array.isArray(data.topLines) ? data.topLines : [],
        coachSummary: data.coachSummary || '',
        createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
        synced: true,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteCloudAnalysis(user: User, analysisId: string): Promise<void> {
  const safeId = sanitizeId(analysisId);
  const path = `users/${user.uid}/analyses/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'analyses', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncTrainingToCloud(user: User, record: TrainingProgressRecord): Promise<void> {
  const safeId = sanitizeId(record.id);
  const path = `users/${user.uid}/training/${safeId}`;
  const ref = doc(db, 'users', user.uid, 'training', safeId);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        solved: Boolean(record.solved),
        attempts: Math.max(0, Math.min(1000, Math.round(record.attempts))),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        ownerId: user.uid,
        puzzleId: record.puzzleId.slice(0, 64),
        category: record.category,
        difficulty: record.difficulty,
        solved: Boolean(record.solved),
        attempts: Math.max(0, Math.min(1000, Math.round(record.attempts))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCloudTraining(user: User): Promise<TrainingProgressRecord[]> {
  const path = `users/${user.uid}/training`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'training'),
      where('ownerId', '==', user.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        puzzleId: data.puzzleId,
        category: data.category,
        difficulty: data.difficulty,
        solved: Boolean(data.solved),
        attempts: Number(data.attempts) || 0,
        updatedAtMs: data.updatedAt?.toMillis?.() ?? Date.now(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
