import React from 'react';

interface SpeedometerProps {
  speedKmh: number;
  rpmNorm: number; // 0..1
  gear: number;
  nitro: number; // 0..100
  nitroActive: boolean;
  speedUnits: 'kmh' | 'mph';
  driftScore?: number;
  driftCombo?: number;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
  speedKmh,
  rpmNorm,
  gear,
  nitro,
  nitroActive,
  speedUnits,
  driftScore = 0,
  driftCombo = 1,
}) => {
  const displaySpeed =
    speedUnits === 'mph'
      ? Math.round(speedKmh * 0.621371)
      : Math.round(speedKmh);
  const unitsLabel = speedUnits.toUpperCase();

  // Dial sweep: 0 km/h = -135deg, 260 km/h = +135deg (total 270deg sweep)
  const clampedSpeed = Math.min(260, Math.max(0, speedKmh));
  const needleAngle = -135 + (clampedSpeed / 260) * 270;

  // Shift light triggers as RPM approaches redline (> 0.85)
  const shiftLightActive = rpmNorm >= 0.85;

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      {/* Drift Points & Combo Badge Floating Above Speedometer */}
      {driftScore > 50 && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F3D2B]/85 backdrop-blur-md border border-[#F2B544]/50 shadow-lg animate-pulse">
          <span className="text-xs uppercase tracking-widest text-[#F2B544] font-bold">
            DRIFT
          </span>
          <span className="text-base font-extrabold font-mono text-[#F5EFD9]">
            {Math.round(driftScore).toLocaleString()}
          </span>
          {driftCombo > 1 && (
            <span className="text-xs font-black px-1.5 py-0.5 rounded bg-[#F2B544] text-[#1F3D2B]">
              {driftCombo}x
            </span>
          )}
        </div>
      )}

      {/* Speedometer Dial Face */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 drop-shadow-2xl">
        <img
          src="/assets/ui/hud-speedometer.svg"
          alt="Speedometer"
          className="w-full h-full object-contain"
        />

        {/* Gauge Needle */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${needleAngle}deg)` }}
        >
          {/* Needle stem */}
          <div
            className="w-1.5 h-18 sm:h-22 rounded-t-full shadow-md"
            style={{
              backgroundColor: shiftLightActive ? '#E8735A' : '#F2B544',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        {/* Center Cap & Shift Light */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-5 h-5 rounded-full border-2 border-[#F5EFD9] shadow-inner transition-colors duration-150 ${
              shiftLightActive ? 'bg-[#E8735A] animate-ping' : 'bg-[#1F3D2B]'
            }`}
          />
        </div>

        {/* Digital Speedometer & Gear Readout */}
        <div className="absolute inset-x-0 bottom-7 sm:bottom-9 flex flex-col items-center">
          <span className="text-3xl sm:text-4xl font-black font-display tracking-tight text-[#F5EFD9] drop-shadow">
            {displaySpeed}
          </span>
          <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#F5EFD9]/60">
            {unitsLabel}
          </span>
        </div>

        {/* Gear Indicator */}
        <div className="absolute top-8 sm:top-10 inset-x-0 flex justify-center items-center">
          <div className="px-2 py-0.5 rounded bg-[#142A1D]/80 border border-[#F5EFD9]/20 text-xs font-extrabold font-mono text-[#F2B544]">
            GEAR {gear}
          </div>
        </div>
      </div>

      {/* Nitro Boost Bar */}
      <div className="w-36 sm:w-44 mt-1 flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-[#F5EFD9]/70">
          <span className="flex items-center gap-1">
            <svg
              className={`w-3 h-3 ${nitroActive ? 'text-[#E8735A] animate-bounce' : 'text-[#F2B544]'}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            NITRO
          </span>
          <span className="font-mono text-[#F2B544]">{Math.round(nitro)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#142A1D] border border-[#F5EFD9]/15 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              nitroActive
                ? 'bg-gradient-to-r from-[#F2B544] via-[#E8913A] to-[#E8735A] shadow-[0_0_12px_#E8913A]'
                : 'bg-gradient-to-r from-[#5BA55B] to-[#F2B544]'
            }`}
            style={{ width: `${nitro}%` }}
          />
        </div>
      </div>
    </div>
  );
};
