'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles, RefreshCw, X, ShieldAlert, Cpu } from 'lucide-react';

interface HighTrafficModalProps {
  isOpen: boolean;
  message?: string;
  isHighDemand?: boolean;
  onRetry: () => void;
  onClose: () => void;
}

export function HighTrafficModal({
  isOpen,
  message,
  isHighDemand = true,
  onRetry,
  onClose,
}: HighTrafficModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/40 bg-neutral-950/95 p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
        >
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* 3D Pulsing Icon */}
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-md"
              />
              <Cpu className="relative h-8 w-8 text-amber-300" />
            </div>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{isHighDemand ? 'AI Server High Traffic Spike' : 'AI Review Difficulty'}</span>
            </h3>

            <p className="mt-2 text-xs text-neutral-300 leading-relaxed max-w-sm">
              {message ||
                'Google Gemini AI servers are currently experiencing temporary high demand spikes. Demand spikes usually clear in a few seconds.'}
            </p>

            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-[11px] text-neutral-400 text-left w-full font-mono flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Your code is safe and intact. Clicking <strong>AI Review Again</strong> will re-connect via our automated fallback model matrix.
              </span>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3 w-full">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-xs text-neutral-300"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="flex-1 gap-2 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>AI Review Again</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
