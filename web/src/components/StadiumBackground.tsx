import React, { useEffect, useRef } from 'react';

interface StadiumBackgroundProps {
  theme?: string;
}

export const StadiumBackground: React.FC<StadiumBackgroundProps> = ({ theme = 'fpl' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Ambient floating particles (stadium dust / volumetric light motes)
    interface AmbientParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      baseAlpha: number;
      pulseSpeed: number;
    }

    const count = theme === 'light' ? 18 : 30;
    const particles: AmbientParticle[] = [];
    for (let i = 0; i < count; i++) {
      const baseAlpha = theme === 'light' ? Math.random() * 0.15 + 0.04 : Math.random() * 0.3 + 0.06;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.08,
        radius: Math.random() * 1.8 + 0.8,
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let time = 0;
    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Color scheme based on active theme
      let col1 = 'rgba(55, 0, 60, 0.2)';
      let col2 = 'rgba(0, 255, 135, 0.03)';
      let col3 = 'rgba(4, 245, 255, 0.12)';
      let partCol1 = '#00ff87';
      let partCol2 = '#04f5ff';

      if (theme === 'dark') {
        col1 = 'rgba(16, 185, 129, 0.12)';
        col2 = 'rgba(6, 182, 212, 0.03)';
        col3 = 'rgba(30, 41, 59, 0.2)';
        partCol1 = '#10b981';
        partCol2 = '#06b6d4';
      } else if (theme === 'volt') {
        col1 = 'rgba(204, 255, 0, 0.14)';
        col2 = 'rgba(0, 242, 254, 0.04)';
        col3 = 'rgba(0, 242, 254, 0.14)';
        partCol1 = '#ccff00';
        partCol2 = '#00f2fe';
      } else if (theme === 'light') {
        col1 = 'rgba(67, 56, 202, 0.05)';
        col2 = 'rgba(5, 150, 105, 0.02)';
        col3 = 'rgba(2, 132, 199, 0.04)';
        partCol1 = '#4338ca';
        partCol2 = '#059669';
      }

      // Draw volumetric spotlight cones
      const spotGrad1 = ctx.createRadialGradient(width * 0.2, 0, 10, width * 0.2, height * 0.5, width * 0.45);
      spotGrad1.addColorStop(0, col1);
      spotGrad1.addColorStop(0.5, col2);
      spotGrad1.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad1;
      ctx.fillRect(0, 0, width, height);

      const spotGrad2 = ctx.createRadialGradient(width * 0.8, 0, 10, width * 0.8, height * 0.5, width * 0.45);
      spotGrad2.addColorStop(0, col3);
      spotGrad2.addColorStop(0.6, col2);
      spotGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad2;
      ctx.fillRect(0, 0, width, height);

      // Render floating particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = p.baseAlpha + Math.sin(time * 4 + i) * 0.05;

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = i % 2 === 0 ? partCol1 : partCol2;
        ctx.shadowColor = i % 2 === 0 ? partCol1 : partCol2;
        ctx.shadowBlur = theme === 'light' ? 0 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-500">
      {/* Dynamic Theme Gradient Background */}
      {theme === 'fpl' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#180525] via-[#080310] to-[#040108]" />
      )}
      {theme === 'dark' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#11141c] via-[#090a0f] to-[#050608]" />
      )}
      {theme === 'volt' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b171e] via-[#060b0e] to-[#030608]" />
      )}
      {theme === 'light' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#edf2f7] via-[#f4f6f9] to-[#ffffff]" />
      )}
      
      {/* Subtle tactical pitch grid */}
      <div className="absolute inset-0 pitch-grid opacity-50" />

      {/* Dynamic Canvas light cones & dust motes */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-75" />

      {/* Top glowing stadium rim */}
      {theme === 'fpl' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-[#37003c]/25 blur-[90px] rounded-full" />
          <div className="absolute top-0 left-1/4 w-80 h-24 bg-[#00ff87]/12 blur-[80px] rounded-full" />
          <div className="absolute top-0 right-1/4 w-80 h-24 bg-[#04f5ff]/12 blur-[80px] rounded-full" />
        </>
      )}
      {theme === 'volt' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-[#0c202d]/40 blur-[90px] rounded-full" />
          <div className="absolute top-0 left-1/4 w-80 h-24 bg-[#ccff00]/15 blur-[80px] rounded-full" />
          <div className="absolute top-0 right-1/4 w-80 h-24 bg-[#00f2fe]/12 blur-[80px] rounded-full" />
        </>
      )}
      {theme === 'dark' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-[#1e293b]/30 blur-[90px] rounded-full" />
          <div className="absolute top-0 left-1/4 w-80 h-24 bg-[#10b981]/10 blur-[80px] rounded-full" />
          <div className="absolute top-0 right-1/4 w-80 h-24 bg-[#06b6d4]/10 blur-[80px] rounded-full" />
        </>
      )}
      {theme === 'light' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-indigo-500/5 blur-[80px] rounded-full" />
          <div className="absolute top-0 left-1/4 w-80 h-20 bg-emerald-500/5 blur-[70px] rounded-full" />
        </>
      )}
    </div>
  );
};
