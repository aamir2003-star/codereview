'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface HeroContentProps {
  /** GSAP-driven opacity for staggered entrance (0 → 1) */
  progress: number;
}

/**
 * HeroContent — typographic layer over the cinematic canvas.
 *
 * Keeps all copy editable via simple JSX.
 * The component receives a `progress` value (0–1) from the parent
 * to fade-in on initial scroll; after that it stays pinned.
 */
export function HeroContent({ progress }: HeroContentProps) {
  const { user, login } = useAuth();

  // Simple staggered opacity for each block
  const headlineOpacity = Math.min(1, progress * 5);
  const subOpacity = Math.min(1, Math.max(0, (progress - 0.05) * 5));
  const ctaOpacity = Math.min(1, Math.max(0, (progress - 0.1) * 5));

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end pb-24 lg:justify-center lg:pb-0 pointer-events-none">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-xl lg:max-w-[42%] space-y-6 pointer-events-auto">
          {/* Pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03]"
            style={{ opacity: headlineOpacity }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="text-[11px] text-white/50 font-medium tracking-wide uppercase">
              AI Code Review Engine
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-[clamp(2.25rem,5vw,4.5rem)] font-bold text-white leading-[1.05] tracking-tight"
            style={{ opacity: headlineOpacity }}
          >
            Code Review,
            <br />
            Without the
            <br />
            Guesswork.
          </h1>

          {/* Supporting copy */}
          <p
            className="text-base sm:text-lg text-white/45 leading-relaxed max-w-md"
            style={{ opacity: subOpacity }}
          >
            Understand every change. Catch problems earlier.
            <br className="hidden sm:inline" />
            Ship with confidence.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center gap-3 pt-2"
            style={{ opacity: ctaOpacity }}
          >
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
              <button className="h-11 px-6 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/40 text-sm font-medium transition-all cursor-pointer">
                See How It Works
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
