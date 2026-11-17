import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export const JuiceOverlay: React.FC = () => {
  const juiceTexts = useGameStore((s) => s.juiceTexts);
  const [, setTick] = useState(0);

  // Periodically trigger re-render to fade out expired items smoothly
  useEffect(() => {
    if (juiceTexts.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [juiceTexts.length]);

  const now = performance.now();
  const activeItems = juiceTexts.filter((item) => now - item.createdAt < 2200);

  if (activeItems.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col items-center justify-center gap-2 select-none overflow-hidden">
      {activeItems.map((item) => {
        const ageMs = now - item.createdAt;
        const progress = Math.min(1, ageMs / 2200);
        const translateY = -progress * 60; // float upwards
        const opacity = progress < 0.15 ? progress / 0.15 : progress > 0.75 ? (1 - progress) / 0.25 : 1;
        const scale = progress < 0.15 ? 0.7 + (progress / 0.15) * 0.4 : 1.1 - progress * 0.1;

        return (
          <div
            key={item.id}
            className="flex flex-col items-center justify-center text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity,
              transition: 'transform 0.05s linear',
            }}
          >
            <span
              className="text-2xl md:text-3xl font-black tracking-wider uppercase"
              style={{ color: item.color || '#F2B544' }}
            >
              {item.text}
            </span>
            {item.subtext && (
              <span className="text-xs md:text-sm font-semibold tracking-wide text-white/90 bg-black/40 px-2 py-0.5 rounded-full mt-0.5">
                {item.subtext}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
