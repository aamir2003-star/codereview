'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameCanvas } from './FrameCanvas';
import { HeroContent } from './HeroContent';
import { FRAME_COUNT, SCRUB_DISTANCE_VH, heroFrames } from './frameConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicHero — full-screen pinned scroll-driven character animation.
 *
 * Architecture:
 *  1. GSAP ScrollTrigger pins the section and maps scroll → progress (0–1).
 *  2. Progress is stored in a ref and synced to FrameCanvas via minimal
 *     React state (only when the frame index actually changes).
 *  3. HeroContent receives progress for an initial fade-in.
 *  4. A preloader overlay is shown until all frames are decoded.
 *  5. `prefers-reduced-motion` skips animation and shows the final frame.
 */
export function CinematicHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [textProgress, setTextProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);

  const frameIndexRef = useRef(0);
  const progressRef = useRef(0);

  /* ------------------------------------------------------------------ */
  /*  Detect prefers-reduced-motion                                      */
  /* ------------------------------------------------------------------ */
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Preload all frames                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    const images = heroFrames.map((src) => {
      const img = new Image();
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
      if (!cancelled) setImagesReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  GSAP ScrollTrigger — pin + scrub                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (reducedMotion || !imagesReady) return;

    const section = sectionRef.current;
    const trigger = triggerRef.current;
    if (!section || !trigger) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: trigger,
        start: 'top top',
        end: `+=${SCRUB_DISTANCE_VH}vh`,
        pin: section,
        pinSpacing: true,
        scrub: 0.3,
        onUpdate: (self) => {
          const p = self.progress; // 0 → 1

          // Frame index (only set state when it actually changes)
          const newIdx = Math.min(
            FRAME_COUNT - 1,
            Math.floor(p * FRAME_COUNT),
          );
          if (newIdx !== frameIndexRef.current) {
            frameIndexRef.current = newIdx;
            setFrameIndex(newIdx);
          }

          // Text progress (only first 15% of scroll)
          const tp = Math.min(1, p / 0.15);
          if (Math.abs(tp - progressRef.current) > 0.01) {
            progressRef.current = tp;
            setTextProgress(tp);
          }
        },
      });
    }, trigger);

    return () => ctx.revert();
  }, [reducedMotion, imagesReady]);

  /* ------------------------------------------------------------------ */
  /*  Reduced motion: just show last frame, full text                     */
  /* ------------------------------------------------------------------ */
  const displayFrame = reducedMotion ? FRAME_COUNT - 1 : frameIndex;
  const displayProgress = reducedMotion ? 1 : textProgress;

  return (
    <div ref={triggerRef}>
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden"
        style={{
          minHeight: '100svh',
          background: '#050505',
        }}
      >
        {/* Preloader overlay */}
        {!imagesReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              <span className="text-xs text-white/30 font-mono tracking-wider uppercase">
                Loading
              </span>
            </div>
          </div>
        )}

        {/* Canvas layer */}
        <FrameCanvas frameIndex={displayFrame} />

        {/* Subtle vignette overlay for depth */}
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #050505 100%)',
          }}
        />

        {/* Left-side darkening for text readability */}
        <div
          className="absolute inset-0 z-[6] pointer-events-none hidden lg:block"
          style={{
            background:
              'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.85) 25%, rgba(5,5,5,0.4) 45%, transparent 65%)',
          }}
        />

        {/* Mobile bottom gradient for text readability */}
        <div
          className="absolute inset-0 z-[6] pointer-events-none lg:hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,5,0.7) 0%, transparent 35%, transparent 50%, rgba(5,5,5,0.85) 70%, #050505 100%)',
          }}
        />

        {/* Text content */}
        <HeroContent progress={displayProgress} />

        {/* Scroll hint at bottom */}
        {imagesReady && !reducedMotion && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-pulse">
            <span className="text-[10px] text-white/25 font-mono tracking-[0.2em] uppercase">
              Scroll
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        )}
      </section>
    </div>
  );
}
