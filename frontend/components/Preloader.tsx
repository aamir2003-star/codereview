'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Cpu, Zap, CheckCircle2 } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

const STAGES = [
  { label: 'INITIALIZING QUANTUM ENCRYPTION', icon: Shield, detail: 'Securing OAuth handshake' },
  { label: 'MAPPING REPOSITORY GRAPH', icon: Cpu, detail: 'Parsing unified AST trees' },
  { label: 'WARMING GEMINI 2.0 NEURAL CORE', icon: Sparkles, detail: 'Loading real-time diff analyzer' },
  { label: 'ESTABLISHING MULTIPLAYER MESH', icon: Zap, detail: 'Ready for live collaboration' },
];

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Smooth Progress & Stage Progression
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDone(true);
          setTimeout(onComplete, 600);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return Math.min(100, next);
      });
    }, 90);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (progress < 30) setCurrentStageIndex(0);
    else if (progress < 60) setCurrentStageIndex(1);
    else if (progress < 90) setCurrentStageIndex(2);
    else setCurrentStageIndex(3);
  }, [progress]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-950 px-4 select-none overflow-hidden"
      >
        {/* Deep 3D Ambient Volumetric Fog */}
        <div className="pointer-events-none absolute -top-40 h-[550px] w-[550px] rounded-full bg-emerald-500/15 blur-[140px] animate-pulse" />
        <div className="pointer-events-none absolute -bottom-40 h-[550px] w-[550px] rounded-full bg-cyan-500/15 blur-[140px] animate-pulse" />

        {/* 3D Cybernetic Grid Floor */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        {/* Central 3D Holographic Gyroscope Reactor */}
        <div className="relative mb-12 flex h-56 w-56 items-center justify-center [perspective:1000px]">
          {/* Ring 1 (Outer Emerald Glow Ring) */}
          <motion.div
            animate={{ rotateX: [0, 360], rotateY: [0, 180], rotateZ: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="absolute h-52 w-52 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
          />

          {/* Ring 2 (Middle Cyan Counter-Rotating Ring) */}
          <motion.div
            animate={{ rotateX: [360, 0], rotateY: [180, 0], rotateZ: [360, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="absolute h-40 w-40 rounded-full border-2 border-cyan-400/30 border-b-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          />

          {/* Ring 3 (Inner Violet Ring) */}
          <motion.div
            animate={{ rotateY: [0, 360], rotateZ: [0, 180] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="absolute h-28 w-28 rounded-full border border-violet-400/40 border-r-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.3)]"
          />

          {/* Glowing Reactor Core with Pulse */}
          <motion.div
            animate={{ scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-emerald-500 text-neutral-950 shadow-[0_0_40px_rgba(16,185,129,0.8)]"
          >
            <Sparkles className="h-8 w-8 animate-spin text-neutral-950 [animation-duration:8s]" />
          </motion.div>

          {/* Orbiting Photon Nodes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute h-48 w-48"
          >
            <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_15px_#34d399]" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute h-36 w-36"
          >
            <div className="ml-auto h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
          </motion.div>
        </div>

        {/* 3D Glass HUD Container */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-full max-w-md rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        >
          {/* Top Status Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                {isDone ? 'SYSTEM INITIALIZED' : 'SYNCHRONIZING ENVIRONMENT'}
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-white">
              {progress}%
            </span>
          </div>

          {/* Animated Quantum Progress Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-950 p-0.5 border border-neutral-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          {/* Step Sequence Checklist */}
          <div className="mt-6 space-y-2.5">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isPast = idx < currentStageIndex || isDone;
              const isCurrent = idx === currentStageIndex && !isDone;

              return (
                <motion.div
                  key={stage.label}
                  animate={{
                    opacity: isPast ? 0.9 : isCurrent ? 1 : 0.35,
                    x: isCurrent ? 3 : 0,
                  }}
                  className={`flex items-center justify-between rounded-xl border p-2.5 transition-all duration-300 text-xs font-mono ${
                    isPast
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                      : isCurrent
                      ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200 shadow-md shadow-cyan-500/10'
                      : 'border-neutral-800/40 bg-neutral-950/30 text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isPast ? 'text-emerald-400' : isCurrent ? 'text-cyan-400 animate-pulse' : 'text-neutral-600'}`} />
                    <div className="truncate">
                      <p className="font-bold truncate text-[11px]">{stage.label}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{stage.detail}</p>
                    </div>
                  </div>

                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 ml-2" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping ml-2 shrink-0" />
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Footnote */}
          <div className="mt-5 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-[10px] font-mono text-neutral-400">
            <span>CORE: GEMINI 2.0 FLASH</span>
            <span className="text-emerald-400 font-bold">READY IN T-0</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
