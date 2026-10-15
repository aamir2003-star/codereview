'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KineticTextGrid from '@/components/ui/KineticTextGrid';

interface PreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export function Preloader({
  onComplete,
  minDurationMs = 2400,
}: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Smooth numeric counter calibrated to last minDurationMs (2.4s)
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const targetPercent = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));

      setProgress(targetPercent);

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setProgress(100);
        setIsDone(true);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete, minDurationMs]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#050505] p-6 sm:p-12 text-white select-none overflow-hidden"
        >
          {/* Background Kinetic Text Grid with App Name */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <KineticTextGrid
              text="REVIEW COPILOT"
              backgroundColor="#050505"
              textColor="#FFFFFF"
              font={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 48,
                lineHeight: '1.4em',
                letterSpacing: '-0.02em',
              }}
              rowCount={5}
              repeatCount={5}
              rowGap={18}
              wordGap={28}
              zoomScalePct={115}
            />
          </div>

          {/* Top Telemetry Header */}
          <div className="relative z-10 w-full max-w-5xl flex items-center justify-between text-[11px] font-mono text-[#71717a] border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] animate-ping" />
              <span className="text-white font-medium tracking-wider">REVIEWCOPILOT // SYSTEM_INITIALIZE</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-[#52525b]">
              <span>AST: COMPILED</span>
              <span>RENDER: 60FPS</span>
              <span>BUFFER: READY</span>
            </div>
            <div className="text-white font-mono font-medium">
              [{String(progress).padStart(3, '0')}%]
            </div>
          </div>

          {/* Central Progress HUD */}
          <div className="relative z-10 my-auto flex flex-col items-center text-center space-y-6 max-w-xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-mono text-xs uppercase tracking-[0.35em] text-[#a1a1aa]"
            >
              Autonomous Code Intelligence
            </motion.div>

            {/* Precision Laser Line Progress Bar */}
            <div className="relative w-64 sm:w-80 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[#007acc] to-white shadow-[0_0_12px_#007acc]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.15 }}
              />
            </div>

            <div className="font-mono text-[10px] text-[#71717a] tracking-widest pt-2">
              QUANTUM_DIFF_VECTOR // READY
            </div>
          </div>

          {/* Bottom Reticle Footer */}
          <div className="relative z-10 w-full max-w-5xl flex items-center justify-between text-[10px] font-mono text-[#52525b] border-t border-white/[0.06] pt-4">
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
