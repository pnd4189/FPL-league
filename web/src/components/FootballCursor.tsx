import React, { useEffect, useRef, useState } from 'react';

interface SpinningBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  angle: number;
  spinSpeed: number;
  glowColor: string;
}

export const FootballCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Check for touch device / mobile
    const checkTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (checkTouch()) {
      setIsTouchDevice(true);
      return;
    }

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsEnabled(false);
      return;
    }

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

    const mouse = {
      x: width / 2,
      y: height / 2,
      prevX: width / 2,
      prevY: height / 2,
      vx: 0,
      vy: 0,
      speed: 0,
      isHovering: false,
      ballAngle: 0,
      scale: 1,
      targetScale: 1,
    };

    const trailingBalls: SpinningBall[] = [];
    const maxTrailingBalls = 10;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      mouse.vx = mouse.x - mouse.prevX;
      mouse.vy = mouse.y - mouse.prevY;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);

      // Rotate ball proportional to movement speed
      mouse.ballAngle += mouse.speed * 0.09;

      // Spawn subtle spinning mini football particles only on active fast movement
      if (mouse.speed > 2.5) {
        if (trailingBalls.length < maxTrailingBalls && Math.random() > 0.4) {
          trailingBalls.push({
            x: mouse.x - mouse.vx * 0.4 + (Math.random() - 0.5) * 1.5,
            y: mouse.y - mouse.vy * 0.4 + (Math.random() - 0.5) * 1.5,
            vx: -mouse.vx * 0.08 + (Math.random() - 0.5) * 0.4,
            vy: -mouse.vy * 0.08 + (Math.random() - 0.5) * 0.4,
            // Compact & uniform radius for trailing balls
            radius: Math.min(3.2, Math.max(1.5, mouse.speed * 0.08 + Math.random() * 0.8)),
            alpha: 0.7,
            decay: Math.random() * 0.045 + 0.035,
            angle: mouse.ballAngle + (Math.random() - 0.5),
            spinSpeed: (Math.random() - 0.5) * 0.2 + (mouse.speed > 0 ? 0.08 : -0.08),
            glowColor: Math.random() > 0.5 ? '#00ff87' : '#04f5ff',
          });
        }
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only scale on actual interactive actionable elements (buttons, links, clickable cards), not plain text or table rows
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[role="button"]') ||
        target.classList.contains('interactive') ||
        target.closest('.interactive')
      ) {
        mouse.targetScale = 1.12;
        mouse.isHovering = true;
      } else {
        mouse.targetScale = 1.0;
        mouse.isHovering = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    document.body.classList.add('custom-cursor-active');

    /**
     * Draw Realistic Compact 3D Soccer Ball
     */
    const drawRealisticSoccerBall = (
      x: number,
      y: number,
      radius: number,
      angle: number,
      alpha: number = 1,
      glowColor?: string
    ) => {
      if (radius <= 0.8 || alpha <= 0.02) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Outer Glow when hovering or trailing
      if (glowColor) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = glowColor === '#00ff87' ? 'rgba(0, 255, 135, 0.25)' : 'rgba(4, 245, 255, 0.25)';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      // Ball Outer Circle
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // 3D Sphere Shading Gradient
      const sphereGrad = ctx.createRadialGradient(
        -radius * 0.35,
        -radius * 0.35,
        radius * 0.08,
        0,
        0,
        radius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.5, '#f8fafc');
      sphereGrad.addColorStop(0.8, '#cbd5e1');
      sphereGrad.addColorStop(1, '#64748b');

      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Reset shadow for internal panels
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Outer seam border
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = Math.max(0.5, radius * 0.06);
      ctx.stroke();

      // 1. Center Pentagon
      const pR = radius * 0.42;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * pR;
        const py = Math.sin(a) * pR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const pentGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pR);
      pentGrad.addColorStop(0, '#1e293b');
      pentGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = pentGrad;
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(0.5, radius * 0.07);
      ctx.stroke();

      // 2. Outer Seams & Corner Patches
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const a2 = ((i + 1) * 2 * Math.PI) / 5 - Math.PI / 2;
        const midA = (a1 + a2) / 2;

        const px = Math.cos(a1) * pR;
        const py = Math.sin(a1) * pR;
        const edgeX = Math.cos(a1) * radius;
        const edgeY = Math.sin(a1) * radius;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(edgeX, edgeY);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
        ctx.lineWidth = Math.max(0.5, radius * 0.06);
        ctx.stroke();

        // Corner black patch on edge
        const patchX = Math.cos(midA) * radius * 0.85;
        const patchY = Math.sin(midA) * radius * 0.85;
        const patchR = radius * 0.22;

        ctx.beginPath();
        ctx.arc(patchX, patchY, patchR, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(0.4, radius * 0.04);
        ctx.stroke();
      }

      // 3. Curved Gloss Reflection
      ctx.beginPath();
      ctx.ellipse(
        -radius * 0.38,
        -radius * 0.38,
        radius * 0.3,
        radius * 0.14,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      ctx.restore();
    };

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth scale interpolation for main ball
      mouse.scale += (mouse.targetScale - mouse.scale) * 0.2;

      // 1. Update and draw Spinning Trailing Mini-Footballs
      for (let i = trailingBalls.length - 1; i >= 0; i--) {
        const ball = trailingBalls[i];
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.angle += ball.spinSpeed;
        ball.alpha -= ball.decay;
        ball.radius = Math.max(0.4, ball.radius - 0.08);

        if (ball.alpha <= 0 || ball.radius <= 0.8) {
          trailingBalls.splice(i, 1);
          continue;
        }

        drawRealisticSoccerBall(
          ball.x,
          ball.y,
          ball.radius,
          ball.angle,
          ball.alpha,
          ball.glowColor
        );
      }

      // 2. Draw Main Football Cursor (Ultra-sleek compact size: ~5.2px radius)
      const mainRadius = 5.2 * mouse.scale;
      drawRealisticSoccerBall(
        mouse.x,
        mouse.y,
        mainRadius,
        mouse.ballAngle,
        1,
        mouse.isHovering ? '#00ff87' : undefined
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.body.classList.remove('custom-cursor-active');
    };
  }, [isEnabled]);

  if (isTouchDevice || !isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999]"
      style={{ willChange: 'transform' }}
    />
  );
};
