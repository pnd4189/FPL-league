import React from 'react';

interface StadiumBackgroundProps {
  theme?: string;
}

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
