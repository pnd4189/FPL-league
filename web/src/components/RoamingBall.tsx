import React, { useEffect, useRef } from 'react';

const GRAVITY = 900; // px per second squared
const BOUNCE = 0.78; // share of speed kept after hitting the floor
const KICK_EVERY = 2.4; // seconds between random kicks that send the ball back into the air

/** Regular pentagon points around (cx, cy); the black patches of a football. */
function pentagon(cx: number, cy: number, r: number, rotation = -90): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rotation + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// Patches on the rim, cut by the ball outline; the seams link them to the centre patch.
const RIM = [-90, -18, 54, 126, 198].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: 100 + 98 * Math.cos(a), y: 100 + 98 * Math.sin(a), a };
});

const SEAMS = RIM.flatMap((p) => {
  const inner = { x: 100 + 36 * Math.cos(p.a), y: 100 + 36 * Math.sin(p.a) };
  const outer = { x: 100 + 70 * Math.cos(p.a), y: 100 + 70 * Math.sin(p.a) };
  return [`M${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`];
});

const BallArt: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    <defs>
      <radialGradient id="rb-body" cx="36%" cy="30%" r="78%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#f2f3f8" />
        <stop offset="1" stopColor="#b3b9cc" />
      </radialGradient>
      <radialGradient id="rb-patch" cx="38%" cy="32%" r="72%">
        <stop offset="0" stopColor="#4a2a5c" />
        <stop offset="0.6" stopColor="#1d0c2b" />
        <stop offset="1" stopColor="#0c0414" />
      </radialGradient>
      <radialGradient id="rb-rim" cx="50%" cy="50%" r="50%">
        <stop offset="0.68" stopColor="#140820" stopOpacity="0" />
        <stop offset="1" stopColor="#140820" stopOpacity="0.38" />
      </radialGradient>
      <radialGradient id="rb-shine" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <clipPath id="rb-clip">
        <circle cx="100" cy="100" r="96" />
      </clipPath>
    </defs>

    <circle cx="100" cy="100" r="96" fill="url(#rb-body)" />
    <g clipPath="url(#rb-clip)">
      <polygon points={pentagon(100, 100, 36)} fill="url(#rb-patch)" />
      {RIM.map((p) => (
        <polygon key={`${p.x}-${p.y}`} points={pentagon(p.x, p.y, 40)} fill="url(#rb-patch)" />
      ))}
      <g stroke="#140820" strokeOpacity="0.28" strokeWidth="1.4" fill="none">
        {SEAMS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle cx="100" cy="100" r="96" fill="url(#rb-rim)" />
    </g>
    <ellipse cx="72" cy="66" rx="34" ry="22" fill="url(#rb-shine)" transform="rotate(-28 72 66)" />
    <circle cx="100" cy="100" r="96" fill="none" stroke="#38003c" strokeOpacity="0.22" strokeWidth="2" />
  </svg>
);

/**
 * A football that flies across the whole page: gravity pulls it down, it bounces
 * off the floor and the walls, and gets a random kick every few seconds. It rolls
 * as it moves. It moves with transform only and sits behind the content.
 */
export const RoamingBall: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const placeStill = () => {
      el.style.transform = `translate3d(${window.innerWidth * 0.8}px, 96px, 0)`;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      placeStill();
      return;
    }

    let size = el.offsetWidth;
    let x = window.innerWidth * 0.7;
    let y = window.innerHeight * 0.2;
    let vx = 150;
    let vy = 0;
    let roll = 0;
    let spin = 0; // extra turn speed in degrees per second, from clicks; decays
    let kickTimer = 0;
    let last = performance.now();
    let raf = 0;

    // A click sends the ball up and sideways, spinning hard.
    const kickBall = () => {
      vy = -(620 + Math.random() * 260);
      vx = (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 240);
      spin = (vx > 0 ? 1 : -1) * (900 + Math.random() * 600);
      kickTimer = 0;
    };

    const onResize = () => {
      size = el.offsetWidth;
      x = Math.min(x, Math.max(0, window.innerWidth - size));
      y = Math.min(y, Math.max(0, window.innerHeight - size));
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const maxX = Math.max(0, window.innerWidth - size);
      const maxY = Math.max(0, window.innerHeight - size);

      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;

      if (x < 0) {
        x = 0;
        vx = Math.abs(vx);
      } else if (x > maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }
      if (y > maxY) {
        y = maxY;
        vy = -Math.abs(vy) * BOUNCE;
      } else if (y < 0) {
        y = 0;
        vy = Math.abs(vy) * 0.5;
      }

      kickTimer += dt;
      if (kickTimer > KICK_EVERY) {
        kickTimer = 0;
        vy = -(480 + Math.random() * 280);
        vx = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 180);
      }

      spin *= Math.pow(0.35, dt);
      roll += spin * dt;
      // Rolling without slipping: the angle turned equals the distance covered over the radius.
      roll += ((vx * dt) / (size / 2)) * (180 / Math.PI);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${roll.toFixed(1)}deg)`;
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener('resize', onResize);
    el.addEventListener('pointerdown', kickBall);
    raf = requestAnimationFrame((now) => {
      last = now;
      frame(now);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('pointerdown', kickBall);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-auto absolute left-0 top-0 w-16 md:w-24 aspect-square cursor-pointer select-none touch-none will-change-transform"
    >
      <BallArt />
    </div>
  );
};
