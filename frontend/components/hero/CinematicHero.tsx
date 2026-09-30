'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroContent } from './HeroContent';
import { FRAME_COUNT, SCRUB_DISTANCE_VH, heroFrames, FRAME_WIDTH, FRAME_HEIGHT } from './frameConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicHero — scroll-driven 12-frame canvas animation.
 *
 * PERFORMANCE: Zero React state during scroll. Everything runs through
 * refs and direct canvas draws inside GSAP's onUpdate. This gives us
 * locked 60fps because we never trigger a React re-render while scrolling.
 */
export function CinematicHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const readyRef = useRef(false);
  const lastFrameRef = useRef(-1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /*  Draw a frame directly — no React involved                          */
  /* ------------------------------------------------------------------ */
  function drawFrame(index: number) {
    const canvas = canvasRef.current;
    if (!canvas || !readyRef.current) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = imagesRef.current[index];
    if (!img) return;

    // Skip redundant draws
    if (index === lastFrameRef.current) return;
    lastFrameRef.current = index;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dispW = canvas.clientWidth;
    const dispH = canvas.clientHeight;

    const backW = Math.round(dispW * dpr);
    const backH = Math.round(dispH * dpr);

    if (canvas.width !== backW || canvas.height !== backH) {
      canvas.width = backW;
      canvas.height = backH;
    }

    // Fill with background color first (avoid flash)
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, backW, backH);

    // "cover" fit — fill canvas, maintain aspect ratio, crop overflow
    const imgAspect = FRAME_WIDTH / FRAME_HEIGHT;
    const canvasAspect = backW / backH;

    let drawW: number, drawH: number;
    if (canvasAspect > imgAspect) {
      drawW = backW;
      drawH = drawW / imgAspect;
    } else {
      drawH = backH;
      drawW = drawH * imgAspect;
    }

    // Center the image
    const xOff = (backW - drawW) / 2;
    const yOff = (backH - drawH) / 2;

    ctx.drawImage(img, xOff, yOff, drawW, drawH);
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

      // Draw first frame
      drawFrame(0);
    });

    return () => { cancelled = true; };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Detect reduced motion                                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) {
      // Show last frame immediately once loaded
      const check = setInterval(() => {
        if (readyRef.current) {
          drawFrame(FRAME_COUNT - 1);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  GSAP ScrollTrigger — direct canvas draw, zero React state           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    const wrapper = wrapperRef.current;
    const section = sectionRef.current;
    const character = characterRef.current;
    if (!wrapper || !section) return;

    const ctx = gsap.context(() => {
      // Subtle 3D parallax on the character container
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: 'top top',
          end: `+=${SCRUB_DISTANCE_VH}vh`,
          pin: section,
          pinSpacing: true,
          scrub: true, // direct 1:1 — no lerp delay
          onUpdate: (self) => {
            if (!readyRef.current) return;

            const p = self.progress;
            const idx = Math.min(
              FRAME_COUNT - 1,
              Math.floor(p * FRAME_COUNT),
            );

            // Direct canvas draw — no React setState
            drawFrame(idx);
          },
        },
      });

      // Subtle 3D scale + translateZ for depth feel
      if (character) {
        tl.fromTo(
          character,
          { scale: 1.02, y: 10 },
          { scale: 1.0, y: -10, ease: 'none' },
          0,
        );
      }
    }, wrapper);

    return () => ctx.revert();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Resize → redraw current frame                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      // Force redraw at current frame
      const cur = lastFrameRef.current;
      lastFrameRef.current = -1; // reset so drawFrame doesn't skip
      if (readyRef.current && cur >= 0) {
        requestAnimationFrame(() => drawFrame(cur));
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

        {/* Character canvas — lives in a 3D-transform container for parallax */}
        <div
          ref={characterRef}
          className="absolute inset-0 z-[1]"
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{
              imageRendering: 'auto',
              opacity: 0.55,
            }}
          />
        </div>

        {/* Vignette — subtle depth */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #050505 100%)',
          }}
        />

        {/* Left gradient — text readability on desktop */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none hidden lg:block"
          style={{
            background:
              'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.92) 20%, rgba(5,5,5,0.6) 40%, transparent 60%)',
          }}
        />

        {/* Mobile gradient — top and bottom */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none lg:hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,5,0.8) 0%, transparent 30%, transparent 50%, rgba(5,5,5,0.9) 75%, #050505 100%)',
          }}
        />

        {/* Text content — always visible, no animation */}
        <HeroContent />

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[10px] text-white font-mono tracking-[0.2em] uppercase">
            Scroll
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
        </div>
      </section>
    </div>
  );
}
