'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface KineticTextPreloaderProps {
  isReady: boolean;
  loadedCount?: number;
  totalCount?: number;
  onComplete?: () => void;
}

const PHRASES = [
  'INITIALIZING NEURAL AST ENGINE',
  'SYNTHESIZING SYSTEM TOPOLOGY',
  'COMPILING MULTI-LANGUAGE VECTORS',
  'CALIBRATING 60FPS CINEMATIC MATRIX',
  'REVIEW COPILOT // SYSTEM READY',
];

export function KineticTextPreloader({
  isReady,
  loadedCount = 0,
  totalCount = 11,
  onComplete,
}: KineticTextPreloaderProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedPercent, setDisplayedPercent] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Cycle through phrases smoothly
  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 550);

    return () => clearInterval(phraseInterval);
  }, []);

  // Compute percentage based on actual loaded frame assets or simulated smooth increment
  useEffect(() => {
    if (isReady) {
      setDisplayedPercent(100);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 450);
      return () => clearTimeout(timeout);
    } else {
      const calculated = totalCount > 0 ? Math.round((loadedCount / totalCount) * 90) : 0;
      setDisplayedPercent((prev) => Math.max(prev, calculated));
    }
  }, [isReady, loadedCount, totalCount, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-[#050505] p-8 sm:p-12 text-white select-none pointer-events-none"
        >
          {/* Top Telemetry Header */}
          <div className="w-full max-w-5xl flex items-center justify-between text-[11px] font-mono text-[#71717a] border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] animate-ping" />
              <span className="text-white font-medium tracking-wider">REVIEWCOPILOT // SYS_INIT</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-[#52525b]">
              <span>LATENCY: 0.4MS</span>
              <span>RENDER: 60FPS</span>
              <span>BUFFER: 11 FRAMES</span>
            </div>
            <div className="text-white font-mono font-medium">
              [{String(displayedPercent).padStart(3, '0')}%]
            </div>
          </div>

          {/* Central Typographic Kinetic Unit */}
          <div className="my-auto flex flex-col items-center text-center space-y-6 max-w-xl w-full">
            {/* Wordmark / Brand Logo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-mono text-xs uppercase tracking-[0.3em] text-[#a1a1aa]"
            >
              Autonomous Code Intelligence
            </motion.div>

            {/* Kinetic Morphing Words */}
            <div className="h-10 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phraseIndex}
                  initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="font-mono text-sm sm:text-base font-medium tracking-wider text-white"
                >
                  <span className="text-[#007acc] mr-2.5">▶</span>
                  {PHRASES[phraseIndex]}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Precision Laser Line Progress Bar */}
            <div className="relative w-64 sm:w-80 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[#007acc] to-white shadow-[0_0_10px_#007acc]"
                style={{ width: `${displayedPercent}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>

            {/* Micro Coordinates */}
            <div className="font-mono text-[10px] text-[#52525b] tracking-widest pt-2">
              QUANTUM_DIFF_VECTOR // CHUNK_STREAM_OK
            </div>
          </div>

          {/* Bottom Reticle Footer */}
          <div className="w-full max-w-5xl flex items-center justify-between text-[10px] font-mono text-[#52525b] border-t border-white/[0.06] pt-4">
            <span className="flex items-center gap-1.5">
              <span className="text-white/40">[+]</span> KINETIC_DISPATCHER
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scaleY: [0.3, 1.2, 0.3],
                    opacity: [0.2, 0.9, 0.2],
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                  className="w-[2px] h-3 bg-white/70"
                />
              ))}
            </div>
            <span className="text-white/40">STANDBY_MODE</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
