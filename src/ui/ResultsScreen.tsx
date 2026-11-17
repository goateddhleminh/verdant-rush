import React from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  Trophy,
  DollarSign,
  Sparkles,
  RotateCcw,
  Wrench,
  ArrowRight,
  Leaf,
} from 'lucide-react';

export const ResultsScreen: React.FC = () => {
  const store = useGameStore();
  const results = store.lastResults;

  if (!results) return null;

  const isPodium = results.playerPosition <= 3;
  const isWinner = results.playerPosition === 1;

  const formatTime = (ms: number) => {
    if (ms <= 0) return '--:--.--';
    const totalSec = ms / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    const hundredths = Math.floor((totalSec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-none animate-fade-in overflow-y-auto">
      <div className="bg-zinc-950/95 border border-white/15 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
        {/* Top Header: Finish Position */}
        <div className="text-center flex flex-col items-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-2xl ${
              isWinner
                ? 'bg-amber-500 text-zinc-950 shadow-[0_0_30px_rgba(242,181,68,0.5)]'
                : isPodium
                ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_25px_rgba(91,165,91,0.4)]'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Trophy className="w-8 h-8 fill-current" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
            {isWinner
              ? 'Victory! 1st Place'
              : results.playerPosition === 2
              ? '2nd Place Finish'
              : results.playerPosition === 3
              ? '3rd Place Finish'
              : `Finished Position ${results.playerPosition}`}
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            {results.trackId.replace('-', ' ')} • {results.mode.replace('-', ' ')}
          </p>
        </div>

        {/* Rewards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Cash Prize */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Prize Purse
                </span>
                <span className="text-xl md:text-2xl font-black text-white font-mono">
                  +${results.cashEarned.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* XP Gained */}
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                  Driver XP
                </span>
                <span className="text-xl md:text-2xl font-black text-white font-mono">
                  +{results.xpEarned.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          {/* Leaves Earned */}
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Career Leaves
                </span>
                <span className="text-xl md:text-2xl font-black text-white font-mono">
                  +{results.leavesEarned} Leaves
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Driving Highlights & Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-zinc-900/60 p-3.5 rounded-2xl border border-white/5 text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Total Time</span>
            <span className="text-white font-mono font-bold">{formatTime(results.totalTimeMs)}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Best Lap</span>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-mono font-bold">
                {formatTime(results.bestLapMs)}
              </span>
              {results.isNewBestLap && (
                <span className="text-[9px] bg-emerald-500 text-zinc-950 font-black px-1.5 py-0.2 rounded uppercase">
                  New!
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Drift Score</span>
            <span className="text-amber-400 font-mono font-bold">
              {results.driftScore.toLocaleString()} pts
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold block">Flow Highlights</span>
            <span className="text-white font-semibold">
              {results.zenLapsCount} Zen • {results.rushTimesCount} Rush
            </span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Official Race Standings
          </h3>
          <div className="bg-zinc-900/80 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-48 overflow-y-auto">
            {results.standings.map((entry) => (
              <div
                key={entry.id}
                className={`px-4 py-2 flex items-center justify-between text-xs ${
                  entry.isPlayer
                    ? 'bg-emerald-950/40 text-emerald-300 font-bold'
                    : 'text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-mono font-black text-white">
                    {entry.position}
                  </span>
                  <div>
                    <span className="font-semibold block">{entry.name}</span>
                    <span className="text-[10px] text-zinc-500">{entry.vehicleName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span>{formatTime(entry.totalTimeMs)}</span>
                  {entry.eliminated && (
                    <span className="text-red-400 text-[10px] font-bold uppercase">
                      Knocked Out
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2">
          {/* Race Again / Next Event */}
          <button
            onClick={() => store.restartRace()}
            className="flex-1 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
          >
            <RotateCcw className="w-4 h-4 fill-current" />
            Race Again
          </button>

          {/* Garage */}
          <button
            onClick={() => store.setScreen('garage')}
            className="flex-1 w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            Garage & Upgrades
          </button>

          {/* Main Menu */}
          <button
            onClick={() => store.setScreen('menu')}
            className="flex-1 w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
