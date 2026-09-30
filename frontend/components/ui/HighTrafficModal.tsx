'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg border border-[#262626] bg-black p-6 sm:p-8 rounded-none shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#262626] pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#d4a017] shadow-[0_0_6px_#d4a017]" />
              <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
                {isHighDemand ? 'NEURAL ENGINE CONGESTION' : 'ANALYSIS RE-ROUTE'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#262626] hover:border-white text-[#999999] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-lg font-normal uppercase tracking-[2px] text-white">
              Temporary Model Traffic Spike
            </h3>
            <p className="font-serif text-sm text-[#cccccc] leading-relaxed">
              {message ||
                'Google Gemini AI models are currently experiencing transient peak load spikes. The review engine will automatically fall back to alternative nodes.'}
            </p>
          </div>

          <div className="p-4 border border-[#262626] bg-[#0d0d0d] font-mono text-xs text-[#999999] leading-relaxed">
            Your repository diff is cached safely. Click below to re-initiate synthesis via the fallback matrix.
          </div>

          {/* Actions: Pill Buttons */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-white font-mono text-xs uppercase tracking-[2px] transition-all cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="flex-1 h-10 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Review</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
