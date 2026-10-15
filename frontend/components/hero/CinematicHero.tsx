'use client';

import React from 'react';
import ParticleDrift from '@/components/ui/ParticleDrift';
import { HeroContent } from './HeroContent';

export function CinematicHero() {
  return (
    <section
      className="relative w-full overflow-hidden flex flex-col justify-center"
      style={{ minHeight: '100svh', background: '#050505' }}
    >
      {/* Particle Drift WebGL Background */}
      <div className="absolute inset-0 z-0">
        <ParticleDrift
          background="#050505"
          baseColor="#FFFFFF"
          accentColor="#007acc"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
          }}
        />
      </div>

      {/* Vignette Overlay for Depth & Text Readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, #050505 100%)',
        }}
      />

      {/* Subtle Left Gradient Overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none hidden lg:block"
        style={{
          background: 'linear-gradient(90deg, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.4) 35%, transparent 65%)',
        }}
      />

      {/* Hero Typography & CTAs */}
      <HeroContent />

      {/* Scroll Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-25 pointer-events-none">
        <span className="text-[10px] text-white font-mono tracking-[0.2em] uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
