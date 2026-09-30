'use client';

import { useEffect, useRef, useCallback } from 'react';
import { heroFrames, FRAME_WIDTH, FRAME_HEIGHT } from './frameConfig';

interface FrameCanvasProps {
  /** 0-based frame index to render */
  frameIndex: number;
  className?: string;
}

/**
 * FrameCanvas — renders a single cinematic frame onto a <canvas>.
 *
 * Design notes:
 * - Preloads every frame on mount, then resolves readiness.
 * - Draws with "contain" logic so the character is never stretched.
 * - The character is positioned toward center-right on desktop.
 * - Handles devicePixelRatio for crisp Retina rendering.
 * - Redraws on resize without resetting the frame.
 * - All drawing happens outside React rendering (refs + rAF).
 */
export function FrameCanvas({ frameIndex, className }: FrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const currentFrameRef = useRef(frameIndex);

  // Keep ref in sync so draw() always uses latest
  currentFrameRef.current = frameIndex;

  /* ------------------------------------------------------------------ */
  /*  Draw a single frame onto the canvas                                */
  /* ------------------------------------------------------------------ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[currentFrameRef.current];
    if (!img) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dispW = canvas.clientWidth;
    const dispH = canvas.clientHeight;

    // Resize backing store only when needed
    const backingW = Math.round(dispW * dpr);
    const backingH = Math.round(dispH * dpr);
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }

    ctx.clearRect(0, 0, backingW, backingH);

    // "contain" fit — maintain aspect ratio
    const imgAspect = FRAME_WIDTH / FRAME_HEIGHT;
    const canvasAspect = backingW / backingH;

    let drawW: number, drawH: number;
    if (canvasAspect > imgAspect) {
      // Canvas is wider than image — fit by height
      drawH = backingH;
      drawW = drawH * imgAspect;
    } else {
      // Canvas is taller — fit by width
      drawW = backingW;
      drawH = drawW / imgAspect;
    }

    // Position: horizontally offset right on desktop (60% mark),
    // centered on narrow viewports
    const isMobile = dispW < 768;
    const xOffset = isMobile
      ? (backingW - drawW) / 2
      : Math.min(backingW - drawW, backingW * 0.55 - drawW * 0.5);
    const yOffset = (backingH - drawH) / 2;

    ctx.drawImage(img, xOffset, yOffset, drawW, drawH);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Preload all frames                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    const images: HTMLImageElement[] = heroFrames.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    const waitForAll = images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // still resolve to avoid hanging
        }),
    );

    Promise.all(waitForAll).then(() => {
      if (cancelled) return;
      imagesRef.current = images;
      loadedRef.current = true;
      draw();
    });

    return () => {
      cancelled = true;
    };
  }, [draw]);

  /* ------------------------------------------------------------------ */
  /*  Redraw when frame changes (outside React render via rAF)           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frameIndex, draw]);

  /* ------------------------------------------------------------------ */
  /*  Resize observer for responsive canvas                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    return () => ro.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="img"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
