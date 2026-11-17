import React from 'react';

interface LoadingScreenProps {
  progress: number; // 0..100
  statusText: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, statusText }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[#1F3D2B] select-none text-[#F5EFD9]">
      {/* Top Tagline */}
      <div className="text-center mt-6">
        <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8CCBEA]/80">
          A calm, sunlit forest racing game
        </span>
      </div>

      {/* Center Brand */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-[#5BA55B]/20 animate-ping absolute" />
          <div className="w-20 h-20 rounded-full bg-[#5BA55B]/30 flex items-center justify-center border border-[#5BA55B]/40 shadow-xl">
            <svg
              className="w-10 h-10 text-[#F2B544]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-extrabold italic tracking-tight font-display text-[#F5EFD9] drop-shadow-md">
            VERDANT RUSH
          </h1>
          <p className="text-sm font-semibold tracking-wider text-[#F2B544] mt-1">
            "Breathe in. Floor it."
          </p>
        </div>
      </div>

      {/* Bottom Progress Bar & Kind Tip */}
      <div className="w-full max-w-md flex flex-col items-center gap-3 mb-6">
        <div className="w-full flex justify-between text-xs font-semibold tracking-wider text-[#F5EFD9]/80">
          <span className="truncate pr-2">{statusText}</span>
          <span className="font-mono text-[#F2B544]">{Math.round(progress)}%</span>
        </div>

        <div className="w-full h-3 rounded-full bg-[#142A1D] border border-[#F5EFD9]/15 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5BA55B] via-[#F2B544] to-[#E8913A] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-[#F5EFD9]/60 italic mt-1 animate-pulse">
          Take a deep breath and relax. The forest is waiting.
        </p>
      </div>
    </div>
  );
};
