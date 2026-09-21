'use client';

import React, { useEffect, useState } from 'react';
import { Code2 } from 'lucide-react';

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Only run on first session visit
    const hasLoaded = sessionStorage.getItem('preloader_shown');
    if (hasLoaded) {
      setShouldRender(false);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            sessionStorage.setItem('preloader_shown', 'true');
            setTimeout(() => setShouldRender(false), 600);
          }, 200);
          return 100;
        }
        const diff = Math.floor(Math.random() * 18) + 12;
        return Math.min(prev + diff, 100);
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 transition-all duration-700 ${
        isDone ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center max-w-xs w-full px-6">
        {/* Glowing Logo */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 rounded-3xl bg-emerald-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl">
            <Code2 className="h-8 w-8 text-emerald-400 animate-bounce" />
          </div>
        </div>

        {/* Brand & Status */}
        <h2 className="text-lg font-bold text-white tracking-tight mb-1">
          ReviewCopilot
        </h2>
        <p className="text-xs text-neutral-400 mb-6 font-mono">
          Initializing real-time AI review engine...
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800/80">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Counter */}
        <div className="mt-3 text-[11px] font-mono text-neutral-400 flex justify-between w-full">
          <span>STREAM_READY</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
