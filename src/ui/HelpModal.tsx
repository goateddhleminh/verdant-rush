import React from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  X,
  Keyboard,
  Sparkles,
  Leaf,
  Flame,
  Bike,
} from 'lucide-react';

export const HelpModal: React.FC = () => {
  const store = useGameStore();

  if (!store.helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-fade-in overflow-y-auto">
      <div className="bg-zinc-950/95 border border-white/15 rounded-3xl p-5 md:p-7 max-w-2xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              Field Guide & Controls
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Handling techniques, flow dynamics, and vehicle characteristics.
            </p>
          </div>
          <button
            onClick={() => store.setHelpOpen(false)}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Columns */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Controls Table */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4" />
              Keyboard & Gamepad Map
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Accelerate / Throttle</span>
                <span className="font-mono text-white font-bold">W / Up / RT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Steering</span>
                <span className="font-mono text-white font-bold">A/D / Left Stick</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Brake / Reverse</span>
                <span className="font-mono text-white font-bold">S / Down / LT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Drift / Handbrake</span>
                <span className="font-mono text-white font-bold">Space / X Button</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Nitro Boost</span>
                <span className="font-mono text-white font-bold">Shift / A Button</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Change Camera</span>
                <span className="font-mono text-white font-bold">C / Y Button</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Respawn on Track</span>
                <span className="font-mono text-white font-bold">R</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Photo Mode</span>
                <span className="font-mono text-white font-bold">F</span>
              </div>
            </div>
          </div>

          {/* Calm / Rush Flow Explanation */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              The Calm & Rush Flow System
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              Your vehicle’s performance balances two interconnected states. You are rewarded regardless of your preferred driving style:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  Calm Flow
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Rises with smooth racing lines, scenic cruising, clean laps, and taking photos. At 100%, triggers <strong className="text-emerald-300">Zen Lap</strong> with golden world lighting and cash payouts.
                </p>
              </div>

              <div className="bg-amber-950/30 border border-amber-500/20 p-3 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Rush Flow
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Rises through drifts, nitro, near misses, air time, and slipstream drafting. At 100%, unleashes <strong className="text-amber-300">Rush Time</strong> with 6 seconds of free unlimited nitro!
                </p>
              </div>
            </div>
          </div>

          {/* Motorbikes & Soft Handling */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Motorbike Physics & No-Punishment Philosophy
              </h3>
              <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                Bikes dynamically counter-steer and lean up to 42° into apexes. Hard throttle from low speed pops wheelies, and hard braking lifts the rear into a stoppie. If you bump an obstacle or lose balance, you gently right yourself after 1.5 seconds without explosion or game over.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
