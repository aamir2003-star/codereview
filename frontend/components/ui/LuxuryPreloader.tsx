'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LuxuryPreloaderProps {
  progress?: number;
  stage?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

const PHRASES = [
  'INITIALIZING NEURAL AST ENGINE',
  'SYNTHESIZING SYSTEM TOPOLOGY',
  'COMPILING MULTI-LANGUAGE VECTORS',
  'CALIBRATING 60FPS CINEMATIC MATRIX',
  'REVIEW COPILOT // SYSTEM READY',
];

export function LuxuryPreloader({
  progress,
  stage = 'INITIALIZING NEURAL ENGINE',
  subtext,
  size = 'md',
}: LuxuryPreloaderProps) {
  const isFullscreen = size === 'fullscreen';
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const displayedText = stage || PHRASES[phraseIndex];

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#050505] p-8 sm:p-12 text-white select-none">
        {/* Top Telemetry Header */}
        <div className="w-full max-w-5xl flex items-center justify-between text-[11px] font-mono text-[#71717a] border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] animate-ping" />
            <span className="text-white font-medium tracking-wider">REVIEWCOPILOT // TELEMETRY</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-[#52525b]">
            <span>LATENCY: 0.4MS</span>
            <span>RENDER: 60FPS</span>
          </div>
          {progress !== undefined && (
            <div className="text-white font-mono font-medium">
              [{String(Math.round(progress)).padStart(3, '0')}%]
            </div>
          )}
        </div>

        {/* Central Kinetic Block */}
        <div className="my-auto flex flex-col items-center text-center space-y-5 max-w-xl w-full">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#a1a1aa]">
            Autonomous Code Intelligence
          </div>

          <div className="h-10 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayedText}
                initial={{ y: 15, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: -15, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono text-sm sm:text-base font-medium tracking-wider text-white"
              >
                <span className="text-[#007acc] mr-2.5">▶</span>
                {displayedText}
              </motion.div>
            </AnimatePresence>
          </div>

          {progress !== undefined && (
            <div className="relative w-64 sm:w-80 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[#007acc] to-white shadow-[0_0_10px_#007acc]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          )}

          {subtext && (
            <div className="font-mono text-[10px] text-[#71717a] tracking-widest pt-1">
              {subtext}
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="w-full max-w-5xl flex items-center justify-between text-[10px] font-mono text-[#52525b] border-t border-white/[0.06] pt-4">
          <span className="text-white/40">[+] KINETIC_RUNNER</span>
          <span className="text-white/40">STANDBY_OK</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-white">
      <div className="flex items-center gap-2 font-mono text-xs text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] animate-ping" />
        <span>{displayedText}</span>
      </div>
      {progress !== undefined && (
        <div className="relative w-48 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-transparent via-[#007acc] to-white"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {subtext && (
        <div className="font-mono text-[10px] text-[#71717a]">
          {subtext}
        </div>
      )}
    </div>
  );
}
