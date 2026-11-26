import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BookOpen,
  Compass,
  Cpu,
  Edit3,
  FileSearch,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Swords,
  Target,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react';
import { auth, signInWithGoogle, signOutUser, testConnection } from './firebase';
import {
  DEFAULT_SETTINGS,
  deleteCloudAnalysis,
  deleteCloudGame,
  ensureCloudUserProfile,
  fetchCloudAnalyses,
  fetchCloudGames,
  fetchCloudTraining,
  loadLocalAnalyses,
  loadLocalGames,
  loadLocalSettings,
  loadLocalTraining,
  saveLocalAnalyses,
  saveLocalGames,
  saveLocalSettings,
  saveLocalTraining,
  syncAnalysisToCloud,
  syncSavedGameToCloud,
  syncTrainingToCloud,
  updateCloudUserPreferences,
} from './services/storageService';
import type {
  AnalysisHistoryRecord,
  EngineLine,
  NavSection,
  SavedGameRecord,
  TrainingProgressRecord,
  UserSettings,
} from './types/chess';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardHubView } from './components/DashboardHubView';
import { AnalysisView } from './components/AnalysisView';
import { GameReviewView } from './components/GameReviewView';
import { PlayAiView } from './components/PlayAiView';
import { OpeningExplorerView } from './components/OpeningExplorerView';
import { TrainingCentreView } from './components/TrainingCentreView';
import { PositionEditorView } from './components/PositionEditorView';
import { SavedLibraryView } from './components/SavedLibraryView';
import { AiCoachView } from './components/AiCoachView';
import { SettingsView } from './components/SettingsView';

const NAV_ITEMS: { id: NavSection; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analyse', label: 'Analyse Position', icon: Cpu },
  { id: 'review', label: 'Analyse Game', icon: FileSearch },
  { id: 'play', label: 'Play Against AI', icon: Swords },
  { id: 'openings', label: 'Opening Explorer', icon: Compass },
  { id: 'training', label: 'Chess Training', icon: Target },
  { id: 'endgames', label: 'Endgame Training', icon: Trophy },
  { id: 'editor', label: 'Position Editor', icon: Edit3 },
  { id: 'saved', label: 'Saved & History', icon: BookOpen },
  { id: 'coach', label: 'AI Chess Coach', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [section, setSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settings, setSettings] = useState<UserSettings>(() => loadLocalSettings() || DEFAULT_SETTINGS);
  const [games, setGames] = useState<SavedGameRecord[]>(() => loadLocalGames());
  const [analyses, setAnalyses] = useState<AnalysisHistoryRecord[]>(() => loadLocalAnalyses());
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgressRecord[]>(() =>
    loadLocalTraining()
  );

  // Cross-workspace handoff states
  const [analyserSeedFen, setAnalyserSeedFen] = useState<string | undefined>(undefined);
  const [analyserSeedPgn, setAnalyserSeedPgn] = useState<string | undefined>(undefined);
  const [reviewSeedPgn, setReviewSeedPgn] = useState<string | undefined>(undefined);
  const [playSeedFen, setPlaySeedFen] = useState<string | undefined>(undefined);
  const [editorSeedFen, setEditorSeedFen] = useState<string | undefined>(undefined);
  const [coachSeedFen, setCoachSeedFen] = useState<string>(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [coachSeedLines, setCoachSeedLines] = useState<EngineLine[]>([]);

  // Firebase Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Apply light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Test Firestore connection on boot and listen to Auth state
  useEffect(() => {
    testConnection().catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const syncedPrefs = await ensureCloudUserProfile(nextUser, settings);
          if (syncedPrefs) {
            setSettings(syncedPrefs);
            saveLocalSettings(syncedPrefs);
          }
          await pullCloudData(nextUser);
        } catch (err) {
          console.error('Cloud sync initialization notice:', err);
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pullCloudData = async (activeUser: User) => {
    const [cloudGames, cloudAnalyses, cloudTraining] = await Promise.all([
      fetchCloudGames(activeUser),
      fetchCloudAnalyses(activeUser),
      fetchCloudTraining(activeUser),
    ]);

    setGames((prev) => {
      const merged = new Map<string, SavedGameRecord>();
      for (const g of prev) merged.set(g.id, g);
      for (const cg of cloudGames) merged.set(cg.id, cg);
      const list = Array.from(merged.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      saveLocalGames(list);
      return list;
    });

    setAnalyses((prev) => {
      const merged = new Map<string, AnalysisHistoryRecord>();
      for (const a of prev) merged.set(a.id, a);
      for (const ca of cloudAnalyses) merged.set(ca.id, ca);
      const list = Array.from(merged.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
      saveLocalAnalyses(list);
      return list;
    });

    setTrainingProgress((prev) => {
      const merged = new Map<string, TrainingProgressRecord>();
      for (const t of prev) merged.set(t.puzzleId, t);
      for (const ct of cloudTraining) merged.set(ct.puzzleId, ct);
      const list = Array.from(merged.values());
      saveLocalTraining(list);
      return list;
    });

    setSyncMessage('Cloud library synchronized.');
  };

  const handleUpdateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveLocalSettings(updated);
      if (user) {
        updateCloudUserPreferences(user, updated).catch(() => {});
      }
      return updated;
    });
  };

  const handleSaveGame = (game: SavedGameRecord) => {
    setGames((prev) => {
      const next = [game, ...prev.filter((g) => g.id !== game.id)];
      saveLocalGames(next);
      return next;
    });
    if (user) {
      syncSavedGameToCloud(user, game).catch(() => {});
    }
  };

  const handleDeleteGame = (id: string) => {
    setGames((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveLocalGames(next);
      return next;
    });
    if (user) {
      deleteCloudGame(user, id).catch(() => {});
    }
  };

  const handleSaveAnalysis = (record: AnalysisHistoryRecord) => {
    setAnalyses((prev) => {
      const next = [record, ...prev.filter((a) => a.id !== record.id)];
      saveLocalAnalyses(next);
      return next;
    });
    if (user) {
      syncAnalysisToCloud(user, record).catch(() => {});
    }
  };

  const handleDeleteAnalysis = (id: string) => {
    setAnalyses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveLocalAnalyses(next);
      return next;
    });
    if (user) {
      deleteCloudAnalysis(user, id).catch(() => {});
    }
  };

  const handleRecordTrainingProgress = (record: TrainingProgressRecord) => {
    setTrainingProgress((prev) => {
      const next = [record, ...prev.filter((p) => p.puzzleId !== record.puzzleId)];
      saveLocalTraining(next);
      return next;
    });
    if (user) {
      syncTrainingToCloud(user, record).catch(() => {});
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setSyncMessage(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setSyncMessage('Signed out. Local storage remains active.');
  };

  const handleManualSync = async () => {
    if (!user) return;
    setSyncMessage('Syncing...');
    try {
      await ensureCloudUserProfile(user, settings);
      await Promise.all([
        ...games.slice(0, 15).map((g) => syncSavedGameToCloud(user, g)),
        ...analyses.slice(0, 15).map((a) => syncAnalysisToCloud(user, a)),
        ...trainingProgress.slice(0, 20).map((t) => syncTrainingToCloud(user, t)),
      ]);
      await pullCloudData(user);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed.');
    }
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === section) || NAV_ITEMS[0];

  const navigateTo = (target: NavSection) => {
    setSection(target);
    setMobileMenuOpen(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-[#F6F7F9] dark:bg-[#121417] text-[#111318] dark:text-[#F1F3F5]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 border-r border-neutral-200 dark:border-[#23272F] bg-white dark:bg-[#16191E]">
          <div className="h-14 px-5 flex items-center border-b border-neutral-200 dark:border-[#23272F]">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="text-base font-display font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap cursor-pointer"
            >
              ChessAI Pro
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.04] hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-neutral-200 dark:border-[#23272F]">
            {user ? (
              <button
                type="button"
                onClick={() => navigateTo('settings')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.04] text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {user.displayName || 'Account'}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">Cloud Sync On</p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full py-2 px-3 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
              >
                Sign In for Cloud Sync
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-64 max-w-[80vw] h-full bg-white dark:bg-[#16191E] border-r border-neutral-200 dark:border-[#23272F] flex flex-col z-10">
              <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200 dark:border-[#23272F]">
                <span className="text-base font-display font-bold">ChessAI Pro</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-neutral-500 cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Clean Top Bar */}
          <header className="h-14 px-4 lg:px-6 border-b border-neutral-200 dark:border-[#23272F] bg-white dark:bg-[#16191E] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-neutral-600 dark:text-neutral-300 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-sm sm:text-base font-display font-semibold text-neutral-900 dark:text-white truncate">
                {activeNavMeta.label}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
                }
                className="p-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-neutral-600 dark:text-neutral-300 hover:border-emerald-500/50 cursor-pointer"
                aria-label="Toggle light or dark mode"
              >
                {settings.theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          </header>

          {/* Main Workspace Content */}
          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-8 max-w-[1440px] w-full mx-auto">
            {section === 'dashboard' && (
              <DashboardHubView
                games={games}
                analyses={analyses}
                trainingProgress={trainingProgress}
                onNavigate={navigateTo}
                onReviewSamplePgn={(pgn) => {
                  setReviewSeedPgn(pgn);
                  navigateTo('review');
                }}
                onOpenSavedGame={(pgn) => {
                  setAnalyserSeedPgn(pgn);
                  setAnalyserSeedFen(undefined);
                  navigateTo('analyse');
                }}
              />
            )}

            {section === 'analyse' && (
              <AnalysisView
                settings={settings}
                initialFen={analyserSeedFen}
                initialPgn={analyserSeedPgn}
                onSaveGame={handleSaveGame}
                onSaveAnalysis={handleSaveAnalysis}
                onSendToCoach={(fen, lines) => {
                  setCoachSeedFen(fen);
                  setCoachSeedLines(lines);
                  navigateTo('coach');
                }}
                onSendToEditor={(fen) => {
                  setEditorSeedFen(fen);
                  navigateTo('editor');
                }}
                onSendToReview={(pgn) => {
                  setReviewSeedPgn(pgn);
                  navigateTo('review');
                }}
              />
            )}

            {section === 'review' && (
              <GameReviewView
                settings={settings}
                initialPgn={reviewSeedPgn}
                onSaveGame={handleSaveGame}
              />
            )}

            {section === 'play' && (
              <PlayAiView
                settings={settings}
                initialFen={playSeedFen}
                onSaveGame={handleSaveGame}
                onReviewGame={(pgn) => {
                  setReviewSeedPgn(pgn);
                  navigateTo('review');
                }}
              />
            )}

            {section === 'openings' && (
              <OpeningExplorerView
                settings={settings}
                onOpenInAnalyser={(pgn) => {
                  setAnalyserSeedPgn(pgn);
                  setAnalyserSeedFen(undefined);
                  navigateTo('analyse');
                }}
              />
            )}

            {section === 'training' && (
              <TrainingCentreView
                mode="puzzles"
                settings={settings}
                progressRecords={trainingProgress}
                onRecordProgress={handleRecordTrainingProgress}
                onOpenInAnalyser={(fen) => {
                  setAnalyserSeedFen(fen);
                  setAnalyserSeedPgn(undefined);
                  navigateTo('analyse');
                }}
              />
            )}

            {section === 'endgames' && (
              <TrainingCentreView
                mode="endgames"
                settings={settings}
                progressRecords={trainingProgress}
                onRecordProgress={handleRecordTrainingProgress}
                onOpenInAnalyser={(fen) => {
                  setAnalyserSeedFen(fen);
                  setAnalyserSeedPgn(undefined);
                  navigateTo('analyse');
                }}
              />
            )}

            {section === 'editor' && (
              <PositionEditorView
                settings={settings}
                initialFen={editorSeedFen}
                onAnalysePosition={(fen) => {
                  setAnalyserSeedFen(fen);
                  setAnalyserSeedPgn(undefined);
                  navigateTo('analyse');
                }}
                onPlayFromPosition={(fen) => {
                  setPlaySeedFen(fen);
                  navigateTo('play');
                }}
              />
            )}

            {section === 'saved' && (
              <SavedLibraryView
                games={games}
                analyses={analyses}
                isSignedIn={Boolean(user)}
                onOpenGameInAnalyser={(pgn) => {
                  setAnalyserSeedPgn(pgn);
                  setAnalyserSeedFen(undefined);
                  navigateTo('analyse');
                }}
                onOpenGameInReview={(pgn) => {
                  setReviewSeedPgn(pgn);
                  navigateTo('review');
                }}
                onOpenFenInAnalyser={(fen) => {
                  setAnalyserSeedFen(fen);
                  setAnalyserSeedPgn(undefined);
                  navigateTo('analyse');
                }}
                onDeleteGame={handleDeleteGame}
                onDeleteAnalysis={handleDeleteAnalysis}
              />
            )}

            {section === 'coach' && (
              <AiCoachView
                settings={settings}
                contextFen={coachSeedFen}
                contextLines={coachSeedLines}
              />
            )}

            {section === 'settings' && (
              <SettingsView
                settings={settings}
                user={user}
                authLoading={authLoading}
                syncMessage={syncMessage}
                onUpdateSettings={handleUpdateSettings}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onSyncNow={handleManualSync}
              />
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (Compact <= 15% height) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white dark:bg-[#16191E] border-t border-neutral-200 dark:border-[#23272F] grid grid-cols-5">
          {(
            [
              { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
              { id: 'analyse', label: 'Analyse', icon: Cpu },
              { id: 'play', label: 'Play AI', icon: Swords },
              { id: 'review', label: 'Review', icon: FileSearch },
              { id: 'coach', label: 'Coach', icon: Sparkles },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </ErrorBoundary>
  );
}
