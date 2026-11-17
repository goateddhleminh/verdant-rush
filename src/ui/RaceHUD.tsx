import React, { useEffect, useState } from 'react';
import { getActiveSession, inputController, skipFlyoverIntro } from '../game/loop';
import { useGameStore } from '../store/useGameStore';
import { Speedometer } from './Speedometer';
import { Minimap } from './Minimap';
import { FlowMeter } from './FlowMeter';
import { TutorialOverlay } from './TutorialOverlay';
import { JuiceOverlay } from './JuiceOverlay';
import { TouchControls } from './TouchControls';
import { Pause, Camera, Volume2, VolumeX, AlertTriangle, Flag, Timer } from 'lucide-react';

export const RaceHUD: React.FC = () => {
  const store = useGameStore();
  const [, setTick] = useState(0);

  // High-frequency UI tick (30-60 Hz) to keep numbers and gauges silky smooth
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setTick((t) => (t + 1) % 100000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const session = getActiveSession();
  if (!session) return null;

  const player = session.player;
  const isRelaxMode = session.config.mode === 'relax-drive';
  const totalLaps = session.config.laps;
  const currentLap = Math.min(totalLaps, Math.max(1, player.lap));
  const isFinalLap = !isRelaxMode && currentLap === totalLaps && totalLaps > 1;

  // Format time mm:ss.xx
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

  // Live ghost delta display
  const ghostDelta = session.liveGhostDeltaSec;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* ================= TOP BAR ================= */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Position & Lap stats */}
        <div className="flex flex-col gap-2">
          {!isRelaxMode && (
            <div className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2.5 shadow-2xl flex items-center gap-4">
              {/* Position */}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">
                  {session.playerPosition}
                </span>
                <span className="text-sm font-bold text-zinc-400">
                  / {session.allVehicles.length}
                </span>
              </div>

              <div className="w-[1px] h-8 bg-white/15" />

              {/* Lap indicator */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">
                  Lap
                </span>
                <span className="text-lg md:text-xl font-black text-white tracking-tight">
                  {currentLap} <span className="text-xs text-zinc-400 font-semibold">/ {totalLaps}</span>
                </span>
              </div>
            </div>
          )}

          {isRelaxMode && (
            <div className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2 shadow-2xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Relax Drive — Free Roam
              </span>
            </div>
          )}

          {/* Lap Times */}
          <div className="bg-zinc-950/70 backdrop-blur-sm rounded-xl border border-white/5 px-3 py-1.5 shadow-lg flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-[9px] font-bold uppercase text-zinc-500 block leading-none">Time</span>
              <span className="text-white font-semibold">{formatTime(player.currentLapTimeMs)}</span>
            </div>
            {player.bestLapTimeMs > 0 && (
              <div>
                <span className="text-[9px] font-bold uppercase text-zinc-500 block leading-none">Best</span>
                <span className="text-emerald-400 font-semibold">{formatTime(player.bestLapTimeMs)}</span>
              </div>
            )}
            {ghostDelta !== null && (
              <div>
                <span className="text-[9px] font-bold uppercase text-zinc-500 block leading-none">Ghost</span>
                <span
                  className={`font-semibold ${
                    ghostDelta <= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {ghostDelta <= 0 ? '' : '+'}
                  {ghostDelta.toFixed(2)}s
                </span>
              </div>
            )}
          </div>

          {/* Elimination Countdown (if mode is elimination) */}
          {session.config.careerEventId && session.eliminationDuration > 0 && (
            <div className="bg-red-950/80 border border-red-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-red-200 shadow-lg">
              <Timer className="w-4 h-4 text-red-400 animate-spin" />
              <span>Next Knockout in: </span>
              <span className="font-mono font-bold text-white text-sm">
                {Math.ceil(session.eliminationTimer)}s
              </span>
            </div>
          )}
        </div>

        {/* Center: Dynamic Race Banners (Countdown / Wrong Way / Final Lap) */}
        <div className="flex flex-col items-center gap-2">
          {/* Flyover Skip Button */}
          {session.phase === 'flyover' && (
            <button
              onClick={skipFlyoverIntro}
              className="pointer-events-auto bg-zinc-950/80 hover:bg-zinc-900 border border-white/20 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Skip Intro</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">Space</span>
            </button>
          )}

          {/* Countdown Display ("3", "2", "1", "GO!") */}
          {session.phase === 'countdown' && (
            <div className="flex flex-col items-center animate-bounce">
              <span
                className={`text-6xl md:text-8xl font-black italic tracking-tighter drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] ${
                  session.lastCountdownInt === 0
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-amber-400'
                }`}
              >
                {session.lastCountdownInt === 0 ? 'GO!' : session.lastCountdownInt}
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-white/80 bg-black/40 px-3 py-0.5 rounded-full mt-1">
                {session.lastCountdownInt === 0 ? 'Breathe in. Floor it.' : 'Get Ready'}
              </span>
            </div>
          )}

          {/* Wrong Way Warning */}
          {player.wrongWay && session.phase === 'racing' && (
            <div className="bg-red-600/90 text-white px-5 py-1.5 rounded-full border border-red-300 font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse">
              <AlertTriangle className="w-4 h-4 fill-current" />
              Wrong Way! Turn Around
            </div>
          )}

          {/* Final Lap Banner */}
          {isFinalLap && session.phase === 'racing' && (
            <div className="bg-amber-500/90 text-zinc-950 px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
              <Flag className="w-3.5 h-3.5 fill-current" />
              Final Lap!
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons (Pause, Camera, Mute) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Camera View Switch */}
          <button
            onClick={store.cycleCameraMode}
            className="w-10 h-10 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-95"
            title="Cycle Camera View (C)"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={store.toggleMute}
            className="w-10 h-10 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-95"
            title="Mute / Unmute (M)"
          >
            {store.settings.muted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Pause Button */}
          <button
            onClick={() => store.setPaused(true)}
            className="w-10 h-10 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-95"
            title="Pause (Esc / P)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= BOTTOM BAR ================= */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom Left: Minimap */}
        <Minimap />

        {/* Bottom Center: Calm / Rush Flow Meter */}
        <FlowMeter />

        {/* Bottom Right: Speedometer & Tachometer */}
        <Speedometer
          speedKmh={player.speedKmh}
          rpmNorm={player.rpmNorm}
          gear={player.gear}
          nitro={player.nitro}
          nitroActive={player.nitroActive}
          speedUnits={store.settings.speedUnits}
          driftScore={player.currentDriftScore}
          driftCombo={player.driftCombo}
        />
      </div>

      {/* Overlays */}
      <TutorialOverlay />
      <JuiceOverlay />
      {inputController.isTouchDevice && <TouchControls />}
    </div>
  );
};
