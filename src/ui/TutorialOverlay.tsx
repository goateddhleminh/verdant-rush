import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Check, X } from 'lucide-react';

export const TutorialOverlay: React.FC = () => {
  const tutorial = useGameStore((s) => s.tutorial);
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);

  if (tutorial.completed) return null;

  const steps = [
    { key: 'throttle', label: 'Accelerate', keys: 'W / Up' },
    { key: 'steer', label: 'Steer', keys: 'A/D / Left/Right' },
    { key: 'brake', label: 'Brake / Reverse', keys: 'S / Down' },
    { key: 'drift', label: 'Drift Turn', keys: 'Space + Steer' },
    { key: 'nitro', label: 'Nitro Boost', keys: 'Shift' },
  ] as const;

  return (
    <div className="fixed top-20 left-4 z-40 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl max-w-xs text-white pointer-events-auto select-none animate-fade-in">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Driver Orientation
        </h4>
        <button
          onClick={dismissTutorial}
          className="text-zinc-500 hover:text-white p-0.5 transition-colors"
          title="Dismiss tutorial"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {steps.map((step) => {
          const done = tutorial[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-colors ${
                done ? 'bg-emerald-950/40 text-emerald-300' : 'text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    done
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : 'border border-zinc-600 text-transparent'
                  }`}
                >
                  {done && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{step.label}</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">
                {step.keys}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
