import React, { useRef } from 'react';
import { inputController } from '../game/loop';
import { Zap, Hand, ArrowDown, ArrowUp } from 'lucide-react';

export const TouchControls: React.FC = () => {
  const steerAreaRef = useRef<HTMLDivElement>(null);

  // Steer touch handling
  const handleSteerTouch = (e: React.TouchEvent) => {
    if (!steerAreaRef.current) return;
    const rect = steerAreaRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const relX = (touch.clientX - rect.left) / rect.width; // 0..1
    const steerVal = Math.max(-1, Math.min(1, (relX - 0.5) * 2));
    inputController.touchSteer = steerVal;
  };

  const handleSteerEnd = () => {
    inputController.touchSteer = 0;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-0 pointer-events-none z-30 select-none flex justify-between p-4 md:p-6">
      {/* Left Steering Zone */}
      <div
        ref={steerAreaRef}
        onTouchStart={handleSteerTouch}
        onTouchMove={handleSteerTouch}
        onTouchEnd={handleSteerEnd}
        onTouchCancel={handleSteerEnd}
        className="pointer-events-auto self-end w-36 h-36 md:w-44 md:h-44 rounded-full bg-zinc-950/40 backdrop-blur-sm border border-white/10 flex items-center justify-center relative touch-none shadow-xl active:bg-zinc-900/60"
      >
        <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-emerald-400" />
        </div>
        <span className="absolute bottom-2 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
          Steer
        </span>
      </div>

      {/* Right Pedal & Action Controls */}
      <div className="pointer-events-auto self-end flex items-end gap-3 touch-none">
        {/* Handbrake / Drift Button */}
        <button
          onTouchStart={() => (inputController.touchDrift = true)}
          onTouchEnd={() => (inputController.touchDrift = false)}
          onTouchCancel={() => (inputController.touchDrift = false)}
          className="w-14 h-14 rounded-2xl bg-amber-500/30 border border-amber-500/50 backdrop-blur-md flex flex-col items-center justify-center text-amber-300 active:scale-95 transition-transform"
        >
          <Hand className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-0.5">Drift</span>
        </button>

        {/* Nitro Button */}
        <button
          onTouchStart={() => (inputController.touchNitro = true)}
          onTouchEnd={() => (inputController.touchNitro = false)}
          onTouchCancel={() => (inputController.touchNitro = false)}
          className="w-14 h-14 rounded-2xl bg-cyan-500/30 border border-cyan-500/50 backdrop-blur-md flex flex-col items-center justify-center text-cyan-300 active:scale-95 transition-transform"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-0.5">Nitro</span>
        </button>

        {/* Brake / Reverse Pedal */}
        <button
          onTouchStart={() => (inputController.touchBrake = true)}
          onTouchEnd={() => (inputController.touchBrake = false)}
          onTouchCancel={() => (inputController.touchBrake = false)}
          className="w-16 h-20 rounded-2xl bg-red-500/30 border border-red-500/50 backdrop-blur-md flex flex-col items-center justify-center text-red-300 active:scale-95 transition-transform"
        >
          <ArrowDown className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase mt-0.5">Brake</span>
        </button>

        {/* Throttle / Accelerate Pedal */}
        <button
          onTouchStart={() => (inputController.touchThrottle = true)}
          onTouchEnd={() => (inputController.touchThrottle = false)}
          onTouchCancel={() => (inputController.touchThrottle = false)}
          className="w-18 h-24 rounded-2xl bg-emerald-500/40 border border-emerald-400/60 backdrop-blur-md flex flex-col items-center justify-center text-emerald-200 active:scale-95 transition-transform"
        >
          <ArrowUp className="w-7 h-7" />
          <span className="text-[10px] font-black uppercase mt-1">Gas</span>
        </button>
      </div>
    </div>
  );
};
