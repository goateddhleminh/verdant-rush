import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getActiveSession } from '../game/loop';
import { addCalmPoints } from '../game/flow';
import { audioManager } from '../audio/audioManager';
import { Camera, Download, Eye, EyeOff, X } from 'lucide-react';

export const PhotoModeOverlay: React.FC = () => {
  const store = useGameStore();
  const [hideUi, setHideUi] = useState(false);
  const [fov, setFov] = useState(55);
  const [vignette, setVignette] = useState(0.4);
  const [filterPreset, setFilterPreset] = useState<'natural' | 'golden' | 'vivid' | 'mono'>('natural');

  if (!store.photoMode || store.screen !== 'race') return null;

  const handleCapture = () => {
    // Hide UI temporarily while capturing
    setHideUi(true);

    setTimeout(() => {
      try {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          link.download = `verdant-rush-${timestamp}.png`;
          link.href = dataUrl;
          link.click();

          // Rewards Calm and adds stats
          const session = getActiveSession();
          if (session) {
            addCalmPoints(session.flow, 12);
          }
          store.incrementStat('photos', 1);
          audioManager.playOneShot('lap-chime', 0.8, 1.2, 'ui');
          store.addToast({
            title: 'Photo Captured!',
            subtitle: 'Saved to your downloads. +12 Calm flow earned.',
            icon: 'award',
          });
        }
      } catch (err) {
        console.error('Photo capture error:', err);
      } finally {
        setHideUi(false);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* If HUD is hidden for composing, show tiny unhide pill */}
      {hideUi ? (
        <div className="fixed bottom-6 right-6 pointer-events-auto">
          <button
            onClick={() => setHideUi(false)}
            className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            Show Controls (H)
          </button>
        </div>
      ) : (
        <>
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <div className="bg-zinc-950/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Photo Mode — Freeze Frame
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideUi(true)}
                className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-xl transition-all"
                title="Hide HUD to frame shot"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Hide UI
              </button>

              <button
                onClick={() => store.setPhotoMode(false)}
                className="w-9 h-9 bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white rounded-xl flex items-center justify-center backdrop-blur-md shadow-xl transition-all"
                title="Exit Photo Mode (F / Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="self-center bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-3xl p-4 md:p-5 shadow-2xl pointer-events-auto max-w-lg w-full flex flex-col gap-3">
            {/* Filter Presets */}
            <div className="flex items-center justify-center gap-2">
              {(
                [
                  { id: 'natural', label: 'Natural Sun' },
                  { id: 'golden', label: 'Golden Hour' },
                  { id: 'vivid', label: 'Emerald Vivid' },
                  { id: 'mono', label: 'Birch Mono' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setFilterPreset(preset.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                    filterPreset === preset.id
                      ? 'bg-emerald-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Adjustment Sliders */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Focal Length (FOV)</span>
                  <span className="font-mono text-white">{fov}°</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="85"
                  value={fov}
                  onChange={(e) => setFov(Number(e.target.value))}
                  className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Vignette Edge</span>
                  <span className="font-mono text-white">{Math.round(vignette * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={vignette}
                  onChange={(e) => setVignette(Number(e.target.value))}
                  className="accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Shutter Action */}
            <button
              onClick={handleCapture}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(91,165,91,0.4)] active:scale-98 transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Snap & Download Photo
            </button>
          </div>
        </>
      )}
    </div>
  );
};
