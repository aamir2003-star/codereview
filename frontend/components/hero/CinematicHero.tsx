'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroContent } from './HeroContent';
import { KineticTextPreloader } from '@/components/ui/KineticTextPreloader';
import { FRAME_COUNT, SCRUB_DISTANCE_VH, heroFrames, FRAME_WIDTH, FRAME_HEIGHT } from './frameConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicHero — scroll-driven canvas animation with morph transitions.
 *
 * MORPH STRATEGY:
 * Between any two adjacent frames we apply:
 *  1. Eased blend curve (smoothstep) so transition accelerates in and
 *     decelerates out — the eye lingers on key poses.
 *  2. A subtle canvas filter blur that peaks at mid-transition (blend=0.5)
 *     and is zero on clean frames. This simulates motion blur and gives
 *     the brain a "morph" perception instead of a dissolve.
 *  3. Micro-scale interpolation — the image scales ~1% during transition,
 *     adding subtle perceived motion even when pixel content is similar.
 *
 * Result: 11 images feel like a continuous video.
 */
export function CinematicHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const readyRef = useRef(false);
  const lastProgressRef = useRef(-1);
  const characterRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  /** Smoothstep easing for morph feel */
  function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /* ------------------------------------------------------------------ */
  /*  Draw with morph transition                                         */
  /* ------------------------------------------------------------------ */
  function drawAtProgress(progress: number) {
    const canvas = canvasRef.current;
    if (!canvas || !readyRef.current) return;

    if (Math.abs(progress - lastProgressRef.current) < 0.0005) return;
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

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, backW, backH);

    // Continuous float position: 0.0 → (FRAME_COUNT-1)
    const floatIdx = progress * (FRAME_COUNT - 1);
    const idxA = Math.floor(floatIdx);
    const idxB = Math.min(idxA + 1, FRAME_COUNT - 1);
    const rawBlend = floatIdx - idxA;

    // Smoothstep easing on blend for morph feel
    const blend = smoothstep(rawBlend);

    const imgA = imagesRef.current[idxA];
    const imgB = imagesRef.current[idxB];
    if (!imgA) return;

    // CONTAIN fit
    const imgAspect = FRAME_WIDTH / FRAME_HEIGHT;
    const canvasAspect = backW / backH;

    let drawW: number, drawH: number;
    if (canvasAspect > imgAspect) {
      drawH = backH;
      drawW = drawH * imgAspect;
    } else {
      drawW = backW;
      drawH = drawW / imgAspect;
    }

    // Micro-scale: 1.005× at mid-transition, 1.0× at clean frames
    const microScale = 1 + 0.005 * Math.sin(blend * Math.PI);
    const scaledW = drawW * microScale;
    const scaledH = drawH * microScale;

    // Position: center-right desktop, centered mobile
    const isMobile = dispW < 768;
    let xOff: number;
    if (isMobile) {
      xOff = (backW - scaledW) / 2;
    } else {
      xOff = backW * 0.35 - scaledW * 0.15;
      xOff = Math.min(xOff, backW - scaledW);
      xOff = Math.max(xOff, 0);
    }
    const yOff = backH - scaledH;

    // Motion blur: peaks at mid-transition, zero on clean frames
    // sin(blend * PI) gives 0→1→0 curve, peak at blend=0.5
    const blurAmount = 2.5 * Math.sin(rawBlend * Math.PI);

    if (blurAmount > 0.2) {
      ctx.filter = `blur(${blurAmount}px)`;
    } else {
      ctx.filter = 'none';
    }

    if (rawBlend < 0.01 || idxA === idxB) {
      // Clean frame — no blending
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, xOff, yOff, scaledW, scaledH);
    } else {
      // Morph: draw A, then overlay B with eased alpha
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, xOff, yOff, scaledW, scaledH);

      ctx.globalAlpha = blend;
      ctx.drawImage(imgB!, xOff, yOff, scaledW, scaledH);

      ctx.globalAlpha = 1;
    }

    // Reset filter
    ctx.filter = 'none';
  }

  /* ------------------------------------------------------------------ */
  /*  Preload                                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    let count = 0;

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
            const onSingleLoad = () => {
              count += 1;
              if (!cancelled) {
                setLoadedCount(count);
              }
              resolve();
            };

            if (img.complete && img.naturalWidth > 0) {
              onSingleLoad();
            } else {
              img.onload = onSingleLoad;
              img.onerror = onSingleLoad;
            }
          }),
      ),
    ).then(() => {
      if (cancelled) return;
      imagesRef.current = images;
      readyRef.current = true;
      setIsReady(true);
      drawAtProgress(0);
    });

    return () => { cancelled = true; };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Reduced motion fallback                                             */
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

      if (character) {
        tl.fromTo(
          character,
          { scale: 1.03, y: 6 },
          { scale: 1.0, y: -6, ease: 'none' },
          0,
        );
      }
    }, wrapper);

    return () => ctx.revert();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Resize                                                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const cur = lastProgressRef.current;
      lastProgressRef.current = -1;
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
        {/* Kinetic Typographic Preloader */}
        <KineticTextPreloader
          isReady={isReady}
          loadedCount={loadedCount}
          totalCount={FRAME_COUNT}
        />

        {/* Character canvas */}
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
            background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, #050505 100%)',
          }}
        />

        {/* Left gradient — desktop */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none hidden lg:block"
          style={{
            background: 'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.9) 22%, rgba(5,5,5,0.5) 42%, transparent 60%)',
          }}
        />

        {/* Mobile gradient */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none lg:hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(5,5,5,0.75) 0%, transparent 30%, transparent 45%, rgba(5,5,5,0.88) 70%, #050505 100%)',
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
