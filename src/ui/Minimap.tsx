import React, { useMemo } from 'react';
import { getActiveSession } from '../game/loop';

interface MinimapProps {
  className?: string;
}

export const Minimap: React.FC<MinimapProps> = ({ className = '' }) => {
  const session = getActiveSession();

  // Compute bounding box and scaled SVG path from spline samples
  const { pathData, viewBox, toSvgX, toSvgY } = useMemo(() => {
    if (!session || !session.track || session.track.samples.length === 0) {
      return { pathData: '', viewBox: '0 0 200 200', toSvgX: (x: number) => x, toSvgY: (z: number) => z };
    }

    const samples = session.track.samples;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Sample every 4th point for clean SVG path
    const points: [number, number][] = [];
    for (let i = 0; i < samples.length; i += 4) {
      const s = samples[i];
      if (s.position.x < minX) minX = s.position.x;
      if (s.position.x > maxX) maxX = s.position.x;
      if (s.position.z < minZ) minZ = s.position.z;
      if (s.position.z > maxZ) maxZ = s.position.z;
      points.push([s.position.x, s.position.z]);
    }

    const pad = 24;
    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxZ - minZ);
    const size = 180;
    const scale = (size - pad * 2) / Math.max(width, height);

    const offsetX = pad + (size - pad * 2 - width * scale) / 2;
    const offsetY = pad + (size - pad * 2 - height * scale) / 2;

    const toSvgX = (x: number) => offsetX + (x - minX) * scale;
    const toSvgY = (z: number) => offsetY + (z - minZ) * scale;

    let path = '';
    for (let i = 0; i < points.length; i++) {
      const sx = toSvgX(points[i][0]);
      const sy = toSvgY(points[i][1]);
      path += (i === 0 ? 'M' : 'L') + `${sx.toFixed(1)},${sy.toFixed(1)} `;
    }
    path += 'Z';

    return {
      pathData: path,
      viewBox: `0 0 ${size} ${size}`,
      toSvgX,
      toSvgY,
    };
  }, [session?.track?.id]);

  if (!session || !pathData) return null;

  const playerX = toSvgX(session.player.position.x);
  const playerY = toSvgY(session.player.position.z);
  const playerYaw = session.player.yaw;

  return (
    <div
      className={`relative w-36 h-36 md:w-44 md:h-44 bg-zinc-950/75 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl overflow-hidden pointer-events-none select-none ${className}`}
    >
      <svg viewBox={viewBox} className="w-full h-full overflow-visible">
        {/* Track outer outline glow */}
        <path
          d={pathData}
          fill="none"
          stroke="#5BA55B"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.25"
        />
        {/* Track base ribbon */}
        <path
          d={pathData}
          fill="none"
          stroke="#1F3D2B"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Track inner road center line */}
        <path
          d={pathData}
          fill="none"
          stroke="#F5EFD9"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          strokeOpacity="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Start / Finish line indicator */}
        {session.track.samples.length > 0 && (
          <circle
            cx={toSvgX(session.track.samples[0].position.x)}
            cy={toSvgY(session.track.samples[0].position.z)}
            r="4"
            fill="#F2B544"
            stroke="#ffffff"
            strokeWidth="1"
          />
        )}

        {/* AI Rivals dots */}
        {session.rivals.map((rival) => {
          if (rival.physics.eliminated) return null;
          const rx = toSvgX(rival.physics.position.x);
          const ry = toSvgY(rival.physics.position.z);
          return (
            <circle
              key={rival.physics.id}
              cx={rx}
              cy={ry}
              r="3"
              fill="#E8735A"
              stroke="#09090b"
              strokeWidth="1"
              opacity="0.9"
            />
          );
        })}

        {/* Player position marker & directional arrow */}
        <g transform={`translate(${playerX}, ${playerY})`}>
          {/* Subtle pulse ring */}
          <circle r="7" fill="#5BA55B" opacity="0.35" className="animate-ping" />
          {/* Base dot */}
          <circle r="4.5" fill="#5BA55B" stroke="#ffffff" strokeWidth="1.5" />
          {/* Heading arrow */}
          <polygon
            points="0,-8 3,-3 -3,-3"
            fill="#ffffff"
            transform={`rotate(${(-playerYaw * 180) / Math.PI})`}
          />
        </g>
      </svg>
      {/* Track Name tag */}
      <div className="absolute bottom-1.5 left-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
        {session.track.def.name}
      </div>
    </div>
  );
};
