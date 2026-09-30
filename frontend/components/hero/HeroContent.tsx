'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/**
 * HeroContent — always-visible typography layer.
 *
 * No scroll-driven opacity. The text is present from the moment
 * the page loads and stays pinned while the canvas animates behind it.
 */
export function HeroContent() {
  const { user, login } = useAuth();

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end pb-28 lg:justify-center lg:pb-0 pointer-events-none">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-xl lg:max-w-[44%] space-y-6 pointer-events-auto">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04]">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="text-[11px] text-white/50 font-medium tracking-wide uppercase">
              AI Code Review Engine
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold text-white leading-[1.06] tracking-tight">
            Code Review,
            <br />
            Without the
            <br />
            Guesswork.
          </h1>

          {/* Supporting copy */}
          <p className="text-base sm:text-lg text-white/40 leading-relaxed max-w-md">
            Understand every change. Catch problems earlier.
            <br className="hidden sm:inline" />
            Ship with confidence.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user ? (
              <Link href="/dashboard">
                <button className="h-11 px-7 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 cursor-pointer">
                  Start Reviewing
                </button>
              </Link>
            ) : (
              <button
                onClick={login}
                className="h-11 px-7 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 cursor-pointer"
              >
                Start Reviewing
              </button>
            )}

            <a href="#features">
              <button className="h-11 px-6 rounded-xl border border-white/15 text-white/55 hover:text-white hover:border-white/40 text-sm font-medium transition-all cursor-pointer">
                See How It Works
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
