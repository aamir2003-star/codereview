'use client';

import React, { useEffect, useRef } from 'react';

export function LivingCyberCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse coordinates with easing
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 3D Particles
    const PARTICLE_COUNT = 45;
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      radius: number;
      baseRadius: number;
      color: string;
      vx: number;
      vy: number;
      vz: number;
      alpha: number;
    }> = [];

    const colors = [
      'rgba(255, 255, 255, ', // pure white starlight
      'rgba(195, 217, 243, ', // subtle ice-blue (link token)
      'rgba(230, 230, 230, ', // body strong white
      'rgba(153, 153, 153, ', // muted hairline white
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        baseRadius: Math.random() * 2.2 + 1.0,
        radius: 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.15,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.01;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Subtle dynamic perspective mesh grid
      const gridFov = 400;
      const mouseOffsetX = (mouse.x - width / 2) * 0.06;
      const mouseOffsetY = (mouse.y - height / 2) * 0.06;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 0.8;

      // Draw faint 3D cyber grid lines
      const horizonY = height * 0.65 + mouseOffsetY * 0.5;
      for (let x = -width; x < width * 2; x += 140) {
        ctx.beginPath();
        ctx.moveTo(x + mouseOffsetX, height);
        ctx.lineTo(width / 2 + (x - width / 2) * 0.2 + mouseOffsetX * 0.2, horizonY);
        ctx.stroke();
      }

      for (let y = height; y > horizonY; y -= 40) {
        const factor = (y - horizonY) / (height - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 * factor})`;
        ctx.stroke();
      }
      ctx.restore();

      // Render 3D floating nodes and connection web
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.z <= 50) p.z = 800;
        if (p.z > 800) p.z = 50;
        if (p.x < -width) p.x = width;
        if (p.x > width) p.x = -width;
        if (p.y < -height) p.y = height;
        if (p.y > height) p.y = -height;

        const scale = gridFov / (gridFov + p.z);
        const screenX = width / 2 + (p.x + (mouse.x - width / 2) * 0.18) * scale;
        const screenY = height / 2 + (p.y + (mouse.y - height / 2) * 0.18) * scale;
        const screenRadius = p.baseRadius * scale * 2;

        if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
          // Glow effect
          const gradient = ctx.createRadialGradient(
            screenX,
            screenY,
            0,
            screenX,
            screenY,
            screenRadius * 3
          );
          gradient.addColorStop(0, `${p.color}${p.alpha})`);
          gradient.addColorStop(0.5, `${p.color}${p.alpha * 0.3})`);
          gradient.addColorStop(1, `${p.color}0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(screenX, screenY, screenRadius * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(0.7, screenRadius * 0.5), 0, Math.PI * 2);
          ctx.fill();

          // Connect nearby particles in 3D space
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dz = p.z - p2.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 200) {
              const scale2 = gridFov / (gridFov + p2.z);
              const screenX2 = width / 2 + (p2.x + (mouse.x - width / 2) * 0.18) * scale2;
              const screenY2 = height / 2 + (p2.y + (mouse.y - height / 2) * 0.18) * scale2;

              const lineAlpha = (1 - dist / 200) * 0.1;
              ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              ctx.lineTo(screenX2, screenY2);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Subtle Ambient Monochrome Depth */}
      <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-white/[0.02] blur-[150px]" />
      <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-[#c3d9f3]/[0.015] blur-[160px]" />

      {/* Cyber Living Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Fine Hairline Horizontal Atmosphere */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[length:100%_4px] opacity-20" />
    </div>
  );
}
