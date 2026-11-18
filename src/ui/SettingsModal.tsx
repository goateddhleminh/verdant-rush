import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { QualityLevel, DifficultyLevel } from '../data/types';
import {
  X,
  Volume2,
  Monitor,
  Gamepad2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const store = useGameStore();
  const settings = store.settings;

  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'gameplay' | 'data'>('audio');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!store.settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-fade-in overflow-y-auto">
      <div className="bg-zinc-950/95 border border-white/15 rounded-3xl p-5 md:p-7 max-w-xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              Game Preferences
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tune audio acoustics, graphics quality presets, and driving aids.
            </p>
          </div>
          <button
            onClick={() => store.setSettingsOpen(false)}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-2xl border border-white/5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Audio
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Graphics
          </button>
          <button
            onClick={() => setActiveTab('gameplay')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gameplay'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Handling
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'data'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Data
          </button>
        </div>

        {/* Tab 1: Audio */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Master Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Master Volume</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => store.updateSettings({ masterVolume: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Music */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Music & Flow Synthesizer</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => store.updateSettings({ musicVolume: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* SFX */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Engine & Tyre Sound Effects</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => store.updateSettings({ sfxVolume: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Ambience */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Forest Wind & Stream Ambience</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.ambienceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.ambienceVolume}
                onChange={(e) => store.updateSettings({ ambienceVolume: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Mute Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-zinc-300 font-semibold">Mute All Audio</span>
              <button
                onClick={store.toggleMute}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  settings.muted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {settings.muted ? 'MUTED' : 'UNMUTED'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Graphics */}
        {activeTab === 'video' && (
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Quality Preset */}
            <div>
              <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                Graphics Fidelity
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as QualityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => store.updateSettings({ quality: lvl })}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                      settings.quality === lvl
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md'
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                High enables PCF soft shadows, bloom, vignette, 2,500 instanced foliage props and full draw distance.
              </p>
            </div>

            {/* Brightness & Environmental Clarity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Game Brightness & Exposure</span>
                <span className="font-mono text-emerald-400">
                  {Math.round((settings.brightness ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.brightness ?? 1.0}
                onChange={(e) => store.updateSettings({ brightness: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">
                Adjusts lighting exposure. Lower values deepen forest shadows and make road details and foliage crisper.
              </span>
            </div>

            {/* Camera FOV */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Base Camera FOV</span>
                <span className="font-mono text-emerald-400">{settings.baseFov}°</span>
              </div>
              <input
                type="range"
                min="50"
                max="75"
                value={settings.baseFov}
                onChange={(e) => store.updateSettings({ baseFov: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Camera Shake */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-zinc-300">
                <span className="font-semibold">Camera Shake Intensity</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.cameraShake * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={settings.cameraShake}
                onChange={(e) => store.updateSettings({ cameraShake: Number(e.target.value) })}
                className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Speedometer Units */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-zinc-300 font-semibold">Speedometer Units</span>
              <div className="flex gap-1">
                {(['kmh', 'mph'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => store.updateSettings({ speedUnits: unit })}
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                      settings.speedUnits === unit
                        ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {unit === 'kmh' ? 'km/h' : 'mph'}
                  </button>
                ))}
              </div>
            </div>

            {/* Show FPS */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-zinc-300 font-semibold">Performance Overlay</span>
              <button
                onClick={() => store.updateSettings({ showFps: !settings.showFps })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  settings.showFps
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {settings.showFps ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Gameplay */}
        {activeTab === 'gameplay' && (
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Steering Assist */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-zinc-200 font-semibold block">Counter-Steer Assist</span>
                <span className="text-[11px] text-zinc-500">
                  Stabilizes high-speed drifts automatically
                </span>
              </div>
              <button
                onClick={() => store.updateSettings({ steeringAssist: !settings.steeringAssist })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  settings.steeringAssist
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                {settings.steeringAssist ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* AI Difficulty */}
            <div>
              <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                AI Rival Pace
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['chill', 'normal', 'hard', 'insane'] as DifficultyLevel[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => store.updateSettings({ difficulty: diff })}
                    className={`py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                      settings.difficulty === diff
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Rival Names */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-zinc-300 font-semibold">Rival Driver Nametags</span>
              <button
                onClick={() => store.updateSettings({ showRivalNames: !settings.showRivalNames })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  settings.showRivalNames
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                {settings.showRivalNames ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Data Management */}
        {activeTab === 'data' && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5">
              <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                Local Save Profile
              </h4>
              <p className="text-zinc-400 mt-1 leading-relaxed">
                Your career progress, vehicle liveries, and ghost recordings are saved in your browser localStorage.
              </p>
            </div>

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="py-2.5 px-4 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                Reset Progress & Clear Save
              </button>
            ) : (
              <div className="bg-red-950/80 border border-red-500/50 p-4 rounded-2xl flex flex-col gap-3 text-red-200">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Are you absolutely sure? All career stars, upgrades and cash will reset.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      store.resetProgress();
                      setShowResetConfirm(false);
                      store.setSettingsOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
