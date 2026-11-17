import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { TrackId, GameMode, DifficultyLevel } from '../data/types';
import { getGameData } from '../data/gameData';
import { X, Play, CloudRain } from 'lucide-react';

interface TrackSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: GameMode;
}

export const TrackSelectModal: React.FC<TrackSelectModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'quick-race',
}) => {
  const store = useGameStore();
  const gameData = getGameData();
  const tracks = gameData.tracks;

  const [selectedTrack, setSelectedTrack] = useState<TrackId>('emerald-valley');
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [laps, setLaps] = useState<number>(3);
  const [rivalsCount, setRivalsCount] = useState<number>(7);
  const [gentleRain, setGentleRain] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('chill');

  if (!isOpen) return null;

  const handleStartRace = () => {
    store.startRace({
      mode,
      trackId: selectedTrack,
      laps: mode === 'relax-drive' ? 999 : laps,
      rivalsCount: mode === 'relax-drive' || mode === 'time-trial' ? 0 : rivalsCount,
      gentleRain,
      difficulty,
    });
    onClose();
  };

  const trackMeta: Record<TrackId, { img: string; desc: string; mood: string }> = {
    'emerald-valley': {
      img: '/assets/images/emerald-valley-card.jpg',
      desc: 'Flowing meadows, wildflowers, birches and a crystal stream. Fast & gentle.',
      mood: 'Spring Morning • Wide & Smooth',
    },
    'amber-woods': {
      img: '/assets/images/amber-woods-card.jpg',
      desc: 'Golden maples, fallen leaves, a covered timber bridge and sharp switchbacks.',
      mood: 'Autumn Golden Hour • Technical Drift',
    },
    'lakeside-haven': {
      img: '/assets/images/lakeside-haven-card.jpg',
      desc: 'High cliff road towering over a turquoise lake, sweeping turns & waterfalls.',
      mood: 'Summer Midday • Elevation & Views',
    },
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-fade-in overflow-y-auto">
      <div className="bg-zinc-950/95 border border-white/15 rounded-3xl p-5 md:p-7 max-w-3xl w-full shadow-2xl flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              Select Forest Destination
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose your course, atmospheric conditions, and racing pace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Track Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tracks.map((t) => {
            const isSelected = selectedTrack === t.id;
            const meta = trackMeta[t.id];
            const bestLap = store.bestLapMs[t.id];

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTrack(t.id)}
                className={`relative rounded-2xl border p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 overflow-hidden group ${
                  isSelected
                    ? 'border-emerald-400/80 bg-emerald-950/30 shadow-[0_0_20px_rgba(91,165,91,0.25)] scale-[1.02]'
                    : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/20'
                }`}
              >
                {/* Track Preview Image */}
                <div className="w-full h-28 rounded-xl overflow-hidden relative mb-2.5 bg-zinc-800">
                  <img
                    src={meta.img}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      {t.lengthKm} km
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {'★'.repeat(t.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Track Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {t.name}
                    </h3>
                    <span className="text-[10px] text-zinc-400 block font-medium mt-0.5">
                      {meta.mood}
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {meta.desc}
                    </p>
                  </div>

                  {bestLap && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Record:</span>
                      <span className="text-emerald-400 font-semibold">
                        {(bestLap / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/5 text-xs">
          {/* Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Game Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              className="bg-zinc-800 border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-400"
            >
              <option value="quick-race">Quick Race</option>
              <option value="relax-drive">Relax Drive (Free Roam)</option>
              <option value="time-trial">Time Trial (Ghost)</option>
              <option value="drift-attack">Drift Attack</option>
            </select>
          </div>

          {/* Laps */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Laps
            </label>
            <select
              disabled={mode === 'relax-drive'}
              value={laps}
              onChange={(e) => setLaps(Number(e.target.value))}
              className="bg-zinc-800 border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 focus:outline-none focus:border-emerald-400"
            >
              <option value={1}>1 Lap (Sprint)</option>
              <option value={2}>2 Laps</option>
              <option value={3}>3 Laps (Standard)</option>
              <option value={5}>5 Laps (Endurance)</option>
            </select>
          </div>

          {/* AI Rivals */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              AI Grid
            </label>
            <select
              disabled={mode === 'relax-drive' || mode === 'time-trial'}
              value={rivalsCount}
              onChange={(e) => setRivalsCount(Number(e.target.value))}
              className="bg-zinc-800 border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 focus:outline-none focus:border-emerald-400"
            >
              <option value={0}>Solo (0 Rivals)</option>
              <option value={3}>3 Rivals</option>
              <option value={5}>5 Rivals</option>
              <option value={7}>Full Grid (7 Rivals)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Rival Pace
            </label>
            <select
              disabled={mode === 'relax-drive' || mode === 'time-trial'}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="bg-zinc-800 border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 focus:outline-none focus:border-emerald-400"
            >
              <option value="chill">Chill</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
              <option value="insane">Insane</option>
            </select>
          </div>

          {/* Weather / Rain Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Atmosphere
            </label>
            <button
              onClick={() => setGentleRain(!gentleRain)}
              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                gentleRain
                  ? 'bg-blue-950/60 border-blue-400 text-blue-300'
                  : 'bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5" />
                {gentleRain ? 'Gentle Rain' : 'Sunlit Clear'}
              </span>
              <span className="text-[10px] font-mono">{gentleRain ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleStartRace}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(91,165,91,0.4)] active:scale-98 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          Enter Course • Breathe in. Floor it.
        </button>
      </div>
    </div>
  );
};
