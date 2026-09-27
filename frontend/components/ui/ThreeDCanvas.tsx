'use client';

import React, { useEffect, useRef } from 'react';

export function ThreeDCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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

    // Mouse coordinates in normalized [-1, 1] range
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width) * 2 - 1;
      targetMouseY = (e.clientY / height) * 2 - 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 3D Particles
    const PARTICLE_COUNT = 85;
    interface Particle {
      x: number;
      y: number;
      z: number; // Depth: 0 to 1000
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      hue: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.8 + 0.8,
        hue: Math.random() > 0.4 ? 155 : 185, // Emerald to cyan
      });
    }

    const render = () => {
      // Smooth camera easing towards mouse
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const fov = 400; // Field of view
      const cx = width / 2 + mouseX * 40;
      const cy = height / 2 + mouseY * 40;

      // Draw subtle perspective grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.025)';
      ctx.lineWidth = 1;

      // Update and project particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap around bounds in 3D
        if (p.z <= 50) p.z = 800;
        if (p.z > 800) p.z = 50;
        if (p.x < -width) p.x = width;
        if (p.x > width) p.x = -width;
        if (p.y < -height) p.y = height;
        if (p.y > height) p.y = -height;

        // Perspective 3D Projection
        const scale = fov / (fov + p.z);
        const projX = cx + (p.x - mouseX * 80) * scale;
        const projY = cy + (p.y - mouseY * 80) * scale;
        const projRadius = Math.max(0.5, p.radius * scale * 1.6);
        const alpha = Math.min(0.7, Math.max(0.08, (1 - p.z / 800) * 0.8));

        // Draw particle
        ctx.beginPath();
        ctx.arc(projX, projY, projRadius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${alpha})`;
        ctx.shadowBlur = 12 * scale;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, ${alpha})`;
        ctx.fill();

        // Connect nearby particles in 3D space
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3D < 140) {
            const scale2 = fov / (fov + p2.z);
            const projX2 = cx + (p2.x - mouseX * 80) * scale2;
            const projY2 = cy + (p2.y - mouseY * 80) * scale2;
            const lineAlpha = (1 - dist3D / 140) * 0.18 * scale;

            ctx.beginPath();
            ctx.moveTo(projX, projY);
            ctx.lineTo(projX2, projY2);
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`;
            ctx.shadowBlur = 0;
            ctx.stroke();
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
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"
      aria-hidden="true"
    />
  );
}
