import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Award, DollarSign, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 transform transition-all duration-300 animate-slide-in hover:border-emerald-500/50"
        >
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            {toast.icon === 'dollar' ? (
              <DollarSign className="w-5 h-5" />
            ) : (
              <Award className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-white truncate tracking-tight">
                {toast.title}
              </h4>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-white p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
              {toast.subtitle}
            </p>
            {toast.rewardCash && toast.rewardCash > 0 && (
              <span className="inline-block mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                +${toast.rewardCash.toLocaleString()} Cash
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
