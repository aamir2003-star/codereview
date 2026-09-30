'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroContent } from './HeroContent';
import { FRAME_COUNT, SCRUB_DISTANCE_VH, heroFrames, FRAME_WIDTH, FRAME_HEIGHT } from './frameConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicHero — scroll-driven canvas animation with frame crossfading.
 *
 * SMOOTHNESS STRATEGY:
 * With 12 images, hard-switching frames feels choppy. Instead we treat
 * the progress as a continuous float (e.g. 3.7) and alpha-blend between
 * frame 3 and frame 4 at 70% opacity. This gives the illusion of many
 * more frames — effectively infinite interpolation.
 *
 * PERFORMANCE:
 * - Zero React state during scroll
 * - Direct canvas draws inside GSAP onUpdate
 * - scrub: true for 1:1 scroll mapping
 * - alpha:false canvas for GPU fast path
 * - Compositor layer via will-change + translateZ
 */
export function CinematicHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const readyRef = useRef(false);
  const lastProgressRef = useRef(-1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /*  Draw with crossfade between adjacent frames                        */
  /* ------------------------------------------------------------------ */
  function drawAtProgress(progress: number) {
    const canvas = canvasRef.current;
    if (!canvas || !readyRef.current) return;

    // Skip if progress hasn't meaningfully changed
    if (Math.abs(progress - lastProgressRef.current) < 0.001) return;
    lastProgressRef.current = progress;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dispW = canvas.clientWidth;
    const dispH = canvas.clientHeight;
    const backW = Math.round(dispW * dpr);
    const backH = Math.round(dispH * dpr);

    if (canvas.width !== backW || canvas.height !== backH) {
      canvas.width = backW;
      canvas.height = backH;
    }

    // Background fill
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, backW, backH);

    // Continuous float position: 0.0 → 11.0
    const floatIdx = progress * (FRAME_COUNT - 1);
    const idxA = Math.floor(floatIdx);
    const idxB = Math.min(idxA + 1, FRAME_COUNT - 1);
    const blend = floatIdx - idxA; // 0–1 fraction between frames

    const imgA = imagesRef.current[idxA];
    const imgB = imagesRef.current[idxB];
    if (!imgA) return;

    // CONTAIN fit — show full character, never crop
    const imgAspect = FRAME_WIDTH / FRAME_HEIGHT;
    const canvasAspect = backW / backH;

    let drawW: number, drawH: number;
    if (canvasAspect > imgAspect) {
      // Canvas wider than image — fit by height
      drawH = backH;
      drawW = drawH * imgAspect;
    } else {
      // Canvas taller — fit by width
      drawW = backW;
      drawH = drawW / imgAspect;
    }

    // Position: center-right on desktop, centered on mobile
    const isMobile = dispW < 768;
    let xOff: number;
    if (isMobile) {
      xOff = (backW - drawW) / 2;
    } else {
      // Push character to the right ~60% mark
      xOff = backW * 0.35 - drawW * 0.15;
      // Clamp so character doesn't go off-screen right
      xOff = Math.min(xOff, backW - drawW);
      xOff = Math.max(xOff, 0);
    }

    // Align bottom of character to bottom of canvas
    const yOff = backH - drawH;

    // Draw frame A
    if (blend < 0.01 || idxA === idxB) {
      // No blending needed — single frame
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, xOff, yOff, drawW, drawH);
    } else {
      // Crossfade: draw A at (1-blend), then B at blend on top
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, xOff, yOff, drawW, drawH);

      ctx.globalAlpha = blend;
      ctx.drawImage(imgB!, xOff, yOff, drawW, drawH);

      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Preload all images                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    const images = heroFrames.map((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      return img;
    });

    Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    ).then(() => {
      if (cancelled) return;
      imagesRef.current = images;
      readyRef.current = true;

      // Hide loader
      if (loaderRef.current) {
        loaderRef.current.style.opacity = '0';
        setTimeout(() => {
          if (loaderRef.current) loaderRef.current.style.display = 'none';
        }, 400);
      }

      drawAtProgress(0);
    });

    return () => { cancelled = true; };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Reduced motion — show final frame                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) {
      const check = setInterval(() => {
        if (readyRef.current) {
          drawAtProgress(1);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  GSAP ScrollTrigger                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    const wrapper = wrapperRef.current;
    const section = sectionRef.current;
    const character = characterRef.current;
    if (!wrapper || !section) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: 'top top',
          end: `+=${SCRUB_DISTANCE_VH}vh`,
          pin: section,
          pinSpacing: true,
          scrub: true,
          onUpdate: (self) => {
            if (!readyRef.current) return;
            drawAtProgress(self.progress);
          },
        },
      });

      // Subtle 3D parallax on the character wrapper
      if (character) {
        tl.fromTo(
          character,
          { scale: 1.03, y: 8 },
          { scale: 1.0, y: -8, ease: 'none' },
          0,
        );
      }
    }, wrapper);

    return () => ctx.revert();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Resize → redraw at current progress                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const cur = lastProgressRef.current;
      lastProgressRef.current = -1; // force redraw
      if (readyRef.current && cur >= 0) {
        requestAnimationFrame(() => drawAtProgress(cur));
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden"
        style={{ minHeight: '100svh', background: '#050505' }}
      >
        {/* Loading overlay */}
        <div
          ref={loaderRef}
          className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505] transition-opacity duration-400"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span className="text-[10px] text-white/25 font-mono tracking-[0.15em] uppercase">
              Loading
            </span>
          </div>
        </div>

        {/* Character canvas with 3D parallax container */}
        <div
          ref={characterRef}
          className="absolute inset-0 z-[1]"
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.5 }}
          />
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, #050505 100%)',
          }}
        />

        {/* Left gradient for text readability — desktop */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none hidden lg:block"
          style={{
            background:
              'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.9) 22%, rgba(5,5,5,0.5) 42%, transparent 60%)',
          }}
        />

        {/* Mobile gradient */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none lg:hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,5,0.75) 0%, transparent 30%, transparent 45%, rgba(5,5,5,0.88) 70%, #050505 100%)',
          }}
        />

        {/* Text — always visible */}
        <HeroContent />

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-25">
          <span className="text-[10px] text-white font-mono tracking-[0.2em] uppercase">
            Scroll
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
        </div>
      </section>
    </div>
  );
}
