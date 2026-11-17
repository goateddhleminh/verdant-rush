import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getGameData } from '../data/gameData';
import { CareerEventDef } from '../data/types';
import {
  ArrowLeft,
  Leaf,
  DollarSign,
  Play,
  Lock,
  Trophy,
} from 'lucide-react';

export const JourneyScreen: React.FC = () => {
  const store = useGameStore();
  const gameData = getGameData();
  const cups = gameData.career.cups;

  const [activeCupId, setActiveCupId] = useState<string>(cups[0]?.id || 'sprout-cup');

  // Total leaves
  const totalLeaves = Object.values(store.careerLeaves).reduce((a, b) => a + b, 0);

  const activeCup = cups.find((c) => c.id === activeCupId) || cups[0];
  const isCupUnlocked = totalLeaves >= (activeCup?.unlock.leaves || 0);

  const handleStartEvent = (event: CareerEventDef) => {
    store.startRace({
      mode:
        event.type === 'race' || event.type === 'elimination'
          ? 'journey'
          : event.type === 'time-trial'
          ? 'time-trial'
          : 'drift-attack',
      trackId: event.track,
      laps: event.laps || 3,
      rivalsCount: event.rivals ?? (event.type === 'time-trial' ? 0 : 7),
      difficulty: event.difficulty || 'chill',
      careerEventId: event.id,
    });
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <button
          onClick={() => store.setScreen('menu')}
          className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Main Menu
        </button>

        {/* Currency & Leaves */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
            <Leaf className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-amber-300 font-mono">
              {totalLeaves} Leaves
            </span>
          </div>
          <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-emerald-300 font-mono">
              ${store.cash.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-auto max-w-4xl w-full self-center pointer-events-auto flex flex-col gap-5 py-4">
        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5" />
            Forest Career Journey
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Championship Cups
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Earn leaves across four disciplines: Circuit Races, Time Trials, Drift Slalom, and Knockout Elimination.
          </p>
        </div>

        {/* Cup Selection Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cups.map((cup) => {
            const isSelected = activeCupId === cup.id;
            const unlocked = totalLeaves >= cup.unlock.leaves;
            const cupLeaves = cup.events.reduce(
              (sum, ev) => sum + (store.careerLeaves[ev.id] || 0),
              0
            );
            const maxLeaves = cup.events.length * 3;

            return (
              <div
                key={cup.id}
                onClick={() => setActiveCupId(cup.id)}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-zinc-950/90 border-emerald-400 shadow-[0_0_20px_rgba(91,165,91,0.25)] scale-[1.02]'
                    : 'bg-zinc-950/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {cup.name}
                  </h3>
                  {!unlocked && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                      <Lock className="w-3 h-3" />
                      {cup.unlock.leaves} Leaves
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Progress</span>
                  <span className="text-amber-300 font-mono font-bold flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-amber-400" />
                    {cupLeaves} / {maxLeaves}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event Cards Grid */}
        {isCupUnlocked ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
            {activeCup.events.map((event, idx) => {
              const leaves = store.careerLeaves[event.id] || 0;

              return (
                <div
                  key={event.id}
                  className="bg-zinc-950/85 backdrop-blur-md border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Header: Type & Leaves */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-400 font-mono">
                          0{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white tracking-tight uppercase">
                          {event.name}
                        </h4>
                      </div>

                      {/* Leaves Earned (3 pips) */}
                      <div className="flex gap-1">
                        {[1, 2, 3].map((star) => (
                          <Leaf
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= leaves
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Event Description & Track badge */}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400">
                      <span className="capitalize font-medium text-emerald-300">
                        {event.type.replace('-', ' ')} • {event.track.replace('-', ' ')}
                      </span>
                      <span className="font-mono text-zinc-500">
                        {event.laps ? `${event.laps} Laps` : 'Sprint'}
                      </span>
                    </div>

                    {/* Targets */}
                    <div className="mt-2 bg-zinc-900/60 p-2.5 rounded-xl text-[11px] text-zinc-300 flex flex-col gap-1">
                      {event.targetSeconds && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Gold Target:</span>
                          <span className="font-mono text-amber-300 font-bold">
                            Under {event.targetSeconds['3']}s
                          </span>
                        </div>
                      )}
                      {event.targetScore && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Drift Target:</span>
                          <span className="font-mono text-amber-300 font-bold">
                            {event.targetScore['3']} pts
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Prizes:</span>
                        <span>
                          +${event.rewards.cash.toLocaleString()} • +{event.rewards.xp} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Launch Event Button */}
                  <button
                    onClick={() => handleStartEvent(event)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Enter Event
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <Lock className="w-8 h-8 text-amber-400 mb-2" />
            <h3 className="text-lg font-bold text-white uppercase">Cup Locked</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Earn {activeCup.unlock.leaves - totalLeaves} more leaves across earlier cups to unlock the {activeCup.name}.
            </p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center text-xs text-zinc-500 pointer-events-auto">
        Every completed event guarantees at least 1 leaf. Zero penalty.
      </div>
    </div>
  );
};
