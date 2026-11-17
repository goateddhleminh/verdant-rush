import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { getActiveSession } from '../game/loop';
import { Play, RotateCcw, Camera, Settings, HelpCircle, LogOut } from 'lucide-react';

export const PauseModal: React.FC = () => {
  const store = useGameStore();
  const session = getActiveSession();

  if (!store.isPaused || store.screen !== 'race') return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-zinc-950/90 border border-white/15 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
          Race Paused
        </h2>
        {session && (
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            {session.track.def.name} • {session.config.mode.replace('-', ' ')}
          </p>
        )}

        {/* Buttons List */}
        <div className="w-full flex flex-col gap-2.5 mt-6">
          {/* Resume */}
          <button
            onClick={() => store.setPaused(false)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Race
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              store.setPaused(false);
              store.restartRace();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Restart Event (R)
          </button>

          {/* Photo Mode */}
          <button
            onClick={() => {
              store.setPaused(false);
              store.setPhotoMode(true);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            Photo Mode (F)
          </button>

          {/* Settings */}
          <button
            onClick={() => store.setSettingsOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            Settings
          </button>

          {/* Help & Controls */}
          <button
            onClick={() => store.setHelpOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            Controls & Guide
          </button>

          {/* Quit to Menu */}
          <button
            onClick={() => {
              store.setPaused(false);
              store.setScreen('menu');
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 text-red-300 font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
