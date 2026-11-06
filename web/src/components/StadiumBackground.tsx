import React from 'react';

interface StadiumBackgroundProps {
  theme?: string;
}

/** Regular pentagon points around (cx, cy): the black patches of a football. */
function pentagon(cx: number, cy: number, r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// Ball patches that sit on the rim, clipped by the ball outline.
const RIM_PATCHES = [-90, -18, 54, 126, 198].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: 60 + 56 * Math.cos(a), y: 60 + 56 * Math.sin(a) };
});

// Tapered grass blades: each is a filled sliver from its root (x ± half width) up to a tip.
const BLADES = Array.from({ length: 44 }, (_, i) => ({
  x: (i / 43) * 1440 + ((i * 37) % 13) - 6,
  height: 34 + ((i * 23) % 46),
  lean: ((i * 17) % 21) - 10,
  half: 3 + ((i * 7) % 4),
  delay: (i * 0.37) % 4,
}));

function bladePath(b: (typeof BLADES)[number]): string {
  const tipX = b.x + b.lean;
  const tipY = 140 - b.height;
  const midY = 140 - b.height * 0.55;
  return `M${b.x - b.half} 140 Q${b.x + b.lean * 0.2 - b.half * 0.3} ${midY} ${tipX} ${tipY} Q${b.x + b.lean * 0.2 + b.half * 0.3} ${midY} ${b.x + b.half} 140 Z`;
}

/** Pitch motifs for both themes: a slowly turning ball and a swaying grass edge. Transform only. */
const FplMotifs: React.FC = () => (
  <>
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className="fpl-ball absolute top-16 right-[3%] w-20 md:w-28 opacity-90"
    >
      <defs>
        <clipPath id="fpl-ball-clip">
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#ffffff" stroke="rgba(56, 0, 60, 0.14)" strokeWidth="1" />
      <g clipPath="url(#fpl-ball-clip)" fill="#170b26">
        <polygon points={pentagon(60, 60, 16)} />
        {RIM_PATCHES.map((p) => (
          <polygon key={`${p.x}-${p.y}`} points={pentagon(p.x, p.y, 15)} />
        ))}
      </g>
    </svg>

    <svg
      viewBox="0 0 1440 140"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="absolute bottom-0 left-0 w-full h-24 md:h-36 opacity-60"
    >
      <defs>
        <linearGradient id="fpl-grass" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#047857" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {BLADES.map((b, i) => (
        <path
          key={i}
          className="fpl-blade"
          style={{ animationDelay: `${b.delay}s` }}
          d={bladePath(b)}
          fill="url(#fpl-grass)"
        />
      ))}
    </svg>
  </>
);

export const StadiumBackground: React.FC<StadiumBackgroundProps> = ({ theme = 'fpl' }) => {
  const isDusk = theme === 'dusk';

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base Architectural Canvas */}
        <div
          className="absolute inset-0 transition-colors duration-500 ease-fluid"
          style={{ backgroundColor: 'var(--bg-app)' }}
        />

        {!isDusk ? (
          /* Premier Daylight Studio: Luminous Morning Pitch & Royal Ribbon Wash */
          <>
            <div
              className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1160px] h-[540px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.095) 0%, rgba(56, 0, 60, 0.045) 45%, transparent 76%)',
              }}
            />
            <div
              className="absolute top-8 -left-24 w-[640px] h-[440px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.085) 0%, transparent 72%)',
              }}
            />
            <div
              className="absolute top-20 -right-24 w-[620px] h-[420px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.065) 0%, rgba(79, 70, 229, 0.05) 48%, transparent 74%)',
              }}
            />
            {/* Subtle Pitch Halfway Arc Motif at Top */}
            <svg
              viewBox="0 0 1440 420"
              fill="none"
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[1440px] max-w-none opacity-[0.38]"
              aria-hidden="true"
            >
              <circle cx="720" cy="-40" r="320" stroke="rgba(56, 0, 60, 0.07)" strokeWidth="1" />
              <circle cx="720" cy="-40" r="180" stroke="rgba(4, 120, 87, 0.08)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="120" y1="140" x2="1320" y2="140" stroke="rgba(56, 0, 60, 0.045)" strokeWidth="1" />
            </svg>
          </>
        ) : (
          /* Royal Velvet Dusk: Mid-Tone Broadcast Indigo-Plum Glow (Never Deep Black) */
          <>
            <div
              className="absolute -top-44 left-1/2 -translate-x-1/2 w-[1080px] h-[500px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.24) 0%, rgba(52, 211, 153, 0.09) 48%, transparent 75%)',
              }}
            />
            <div
              className="absolute top-24 right-[8%] w-[540px] h-[380px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.11) 0%, transparent 72%)',
              }}
            />
          </>
        )}

        <FplMotifs />

        {/* Fine Architectural Pitch Coordinate Grid with Top-Fade Mask */}
        <div
          className="absolute inset-0 pitch-grid"
          style={{
            maskImage: 'radial-gradient(ellipse 85% 58% at 50% 16%, #000 18%, transparent 86%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 58% at 50% 16%, #000 18%, transparent 86%)',
          }}
        />
      </div>

      {/* Fixed Film-Grain Overlay (GPU-safe, zero scroll repaint) */}
      <div className="film-grain" aria-hidden="true" />
    </>
  );
};
