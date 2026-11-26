import React from 'react';
import type { User } from 'firebase/auth';
import { Cloud, Laptop, LogOut, Moon, Smartphone, Sun } from 'lucide-react';
import { BOARD_THEMES, ChessPieceSvg, PIECE_STYLES } from './ChessPieces';
import type { BoardThemeId, PieceStyleId, UserSettings } from '../types/chess';

interface SettingsViewProps {
  settings: UserSettings;
  user: User | null;
  authLoading: boolean;
  syncMessage: string | null;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  user,
  authLoading,
  syncMessage,
  onUpdateSettings,
  onSignIn,
  onSignOut,
  onSyncNow,
}) => {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Appearance & Board Themes */}
      <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Appearance & Board Customization
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Switch between light and dark interfaces, board color palettes, and vector piece sets.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#121417]">
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Board Color Theme
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
              const t = BOARD_THEMES[id];
              const active = settings.boardTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateSettings({ boardTheme: id })}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-neutral-200 dark:border-[#2A2F38] hover:border-emerald-500/40'
                  }`}
                >
                  <div className="grid grid-cols-2 w-full h-10 rounded overflow-hidden mb-2 border border-black/15">
                    <div style={{ backgroundColor: t.light }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.dark }} />
                    <div style={{ backgroundColor: t.light }} />
                  </div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {t.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Piece Style
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PIECE_STYLES.map((ps) => {
              const active = settings.pieceStyle === ps.id;
              return (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => onUpdateSettings({ pieceStyle: ps.id as PieceStyleId })}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-neutral-200 dark:border-[#2A2F38] hover:border-emerald-500/40'
                  }`}
                >
                  <div className="w-8 h-8 shrink-0">
                    <ChessPieceSvg type="n" color="w" styleId={ps.id} />
                  </div>
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {ps.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stockfish Resource & Board Preferences */}
      <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-5 space-y-4">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Stockfish 19 Engine & Board Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <span className="flex justify-between font-mono tabular-nums">
              <span>Default Depth</span>
              <span>{settings.engineDepth}</span>
            </span>
            <input
              type="range"
              min={6}
              max={22}
              value={settings.engineDepth}
              onChange={(e) => onUpdateSettings({ engineDepth: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </label>

          <label className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <span className="flex justify-between font-mono tabular-nums">
              <span>Multi-PV Lines</span>
              <span>{settings.multiPv}</span>
            </span>
            <input
              type="range"
              min={1}
              max={5}
              value={settings.multiPv}
              onChange={(e) => onUpdateSettings({ multiPv: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </label>

          <label className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <span>Hash Memory (Resource Cap)</span>
            <select
              value={settings.engineHashMb}
              onChange={(e) => onUpdateSettings({ engineHashMb: Number(e.target.value) })}
              className="w-full rounded-lg border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#121417] px-2.5 py-1.5 font-mono text-xs text-neutral-900 dark:text-neutral-100"
            >
              <option value={16}>16 MB (Mobile Battery Saver)</option>
              <option value={32}>32 MB (Balanced)</option>
              <option value={64}>64 MB (Desktop Standard)</option>
              <option value={128}>128 MB (Deep Analysis)</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {(
            [
              { key: 'soundEnabled', label: 'Move Sound FX' },
              { key: 'showCoordinates', label: 'Board Coordinates' },
              { key: 'showEvalBar', label: 'Evaluation Bar' },
              { key: 'autoAnalyze', label: 'Auto-Run Stockfish' },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={(e) => onUpdateSettings({ [item.key]: e.target.checked })}
                className="accent-emerald-500"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Firebase Optional Cloud Sync */}
      <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-500">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Cloud Synchronisation (Firebase)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user
                  ? `Signed in as ${user.displayName || user.email}`
                  : 'Optional Google Sign-In to sync saved games, analyses, and puzzle progress across devices.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={onSyncNow}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer"
                >
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#2A2F38] text-xs font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authLoading}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
              >
                {authLoading ? 'Connecting...' : 'Sign In with Google'}
              </button>
            )}
          </div>
        </div>
        {syncMessage && <p className="text-xs text-emerald-500">{syncMessage}</p>}
      </section>

      {/* Cross-Platform Packaging Info */}
      <section className="rounded-xl border border-neutral-200 dark:border-[#2A2F38] bg-white dark:bg-[#1A1D22] p-5 space-y-3">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Desktop & Mobile Platforms
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-300">
          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Laptop className="w-4 h-4 text-emerald-500" /> Windows & macOS Desktop (Electron)
            </div>
            <p className="leading-relaxed">
              Preconfigured in <code className="font-mono">electron/main.cjs</code>. Run{' '}
              <code className="font-mono">npm run build</code> and package with Electron Builder for native <code className="font-mono">.dmg</code> and <code className="font-mono">.exe</code> installers.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-[#2A2F38] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Smartphone className="w-4 h-4 text-emerald-500" /> iPhone, iPad & Android (Offline PWA)
            </div>
            <p className="leading-relaxed">
              Installable via Safari Share → Add to Home Screen or Chrome Install App. Stockfish 19 WASM is cached via Service Worker for offline play and analysis.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
