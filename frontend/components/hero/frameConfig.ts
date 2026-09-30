/**
 * Hero cinematic frame configuration.
 * Each entry corresponds to a sequential animation frame
 * drawn to canvas during scroll-driven playback.
 */

export const FRAME_COUNT = 12;

export const heroFrames: string[] = Array.from({ length: FRAME_COUNT }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return `/hero/frame-${num}.png`;
});

/** Scroll distance multiplier (in viewport heights) for the pinned animation */
export const SCRUB_DISTANCE_VH = 300;

/** Image native dimensions (all frames share the same size) */
export const FRAME_WIDTH = 1086;
export const FRAME_HEIGHT = 1448;
