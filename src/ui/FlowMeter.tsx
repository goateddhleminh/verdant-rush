import React from 'react';
import { getActiveSession } from '../game/loop';
import { Sparkles, Flame, Leaf } from 'lucide-react';

interface FlowMeterProps {
  className?: string;
}

export const FlowMeter: React.FC<FlowMeterProps> = ({ className = '' }) => {
  const session = getActiveSession();
  const flow = session?.flow;

  const calm = flow ? Math.round(flow.calm) : 50;
  const rush = flow ? Math.round(flow.rush) : 0;
  const isZenLap = (flow?.zenShimmerRemaining ?? 0) > 0;
  const isRushTime = (flow?.rushTimeRemaining ?? 0) > 0;

  return (
    <div
      className={`relative flex flex-col items-center select-none pointer-events-none transition-all duration-300 ${className}`}
    >
      {/* Active State Badges above meter */}
      <div className="h-6 flex items-center justify-center mb-1">
        {isRushTime && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/90 text-zinc-950 font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(242,181,68,0.8)] animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Rush Time! Free Nitro
          </div>
        )}
        {isZenLap && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/90 text-zinc-950 font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(91,165,91,0.8)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Zen Lap Active (+$500)
          </div>
        )}
      </div>

      {/* Main Flow Leaf-Bar Capsule */}
      <div className="relative w-64 md:w-80 h-9 bg-zinc-950/80 backdrop-blur-md rounded-full border border-white/10 p-1 flex items-center shadow-2xl overflow-hidden">
        {/* Calm Side Fill (Grows from center to left) */}
        <div className="relative w-1/2 h-full flex justify-end items-center pr-1 overflow-hidden">
          <div
            className="h-full rounded-l-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-150 relative shadow-[0_0_12px_rgba(91,165,91,0.6)]"
            style={{ width: `${Math.min(100, Math.max(0, calm))}%` }}
          >
            {calm >= 95 && (
              <div className="absolute inset-0 bg-white/40 animate-pulse rounded-l-full" />
            )}
          </div>
        </div>

        {/* Center Divider / Leaf Emblem */}
        <div className="relative z-10 w-7 h-7 -mx-3.5 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-md">
          <Leaf className={`w-3.5 h-3.5 transition-colors duration-300 ${
            isRushTime ? 'text-amber-400' : isZenLap ? 'text-emerald-400' : 'text-zinc-300'
          }`} />
        </div>

        {/* Rush Side Fill (Grows from center to right) */}
        <div className="relative w-1/2 h-full flex justify-start items-center pl-1 overflow-hidden">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-150 relative shadow-[0_0_12px_rgba(242,181,68,0.6)]"
            style={{ width: `${Math.min(100, Math.max(0, rush))}%` }}
          >
            {rush >= 95 && (
              <div className="absolute inset-0 bg-white/40 animate-pulse rounded-r-full" />
            )}
          </div>
        </div>

        {/* Overlay Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold tracking-wider pointer-events-none">
          <span className="text-emerald-200/90 drop-shadow flex items-center gap-1">
            CALM {calm}%
          </span>
          <span className="text-amber-200/90 drop-shadow flex items-center gap-1">
            RUSH {rush}%
          </span>
        </div>
      </div>
    </div>
  );
};
