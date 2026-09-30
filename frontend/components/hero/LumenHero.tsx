'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, Menu, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function NavItem({
  number,
  label,
  delay,
}: {
  number: string;
  label: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-center gap-[3px] anim-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="font-manrope text-[#AFDDFF]/80 text-[13px] leading-[15.6px]">
        {number}.
      </span>
      <span className="font-manrope text-white text-[13px] leading-[15.6px] cursor-pointer hover:text-[#AFDDFF] transition-colors">
        {label}
      </span>
    </div>
  );
}

function GridLines() {
  const verticalPositions = ['12.6%', '37.5%', '61.9%', '86.2%'];
  const horizontalPositions = ['32.7%', '71.4%'];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 4 Vertical Lines */}
      {verticalPositions.map((left, i) => (
        <div
          key={`v-${i}`}
          className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
          style={{ left, animationDelay: `${600 + i * 100}ms` }}
        />
      ))}

      {/* 2 Horizontal Lines */}
      {horizontalPositions.map((top, i) => (
        <div
          key={`h-${i}`}
          className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
          style={{ top, animationDelay: `${800 + i * 150}ms` }}
        />
      ))}

      {/* 8 Plus Marks at Intersections */}
      {horizontalPositions.map((top, hi) =>
        verticalPositions.map((left, vi) => {
          const delay = 1000 + (hi * 4 + vi) * 80;
          return (
            <div
              key={`plus-${hi}-${vi}`}
              className="absolute anim-scale-in"
              style={{ top, left, animationDelay: `${delay}ms` }}
            >
              <div className="relative">
                <span className="absolute w-[10px] h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
                <span className="absolute w-px h-[10px] bg-white/70 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}

function ConnectorLine({
  x1,
  y1,
  x2,
  y2,
  delay,
}: {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  delay: number;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none anim-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function CentralNodes() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {/* 6 Connector Lines (Elbow Pairs) */}
      {/* 1 (CORE_ENTITY, horizontal) */}
      <ConnectorLine x1="38%" y1="14%" x2="52%" y2="14%" delay={1200} />
      {/* 2 (CORE_ENTITY, diagonal) */}
      <ConnectorLine x1="52%" y1="14%" x2="60%" y2="27%" delay={1400} />
      {/* 3 (LUMINOUS_INSIGHT, diagonal) */}
      <ConnectorLine x1="32%" y1="58%" x2="20%" y2="74%" delay={1500} />
      {/* 4 (LUMINOUS_INSIGHT, horizontal) */}
      <ConnectorLine x1="20%" y1="74%" x2="6%" y2="74%" delay={1700} />
      {/* 5 (CONNECTIVITY, horizontal) */}
      <ConnectorLine x1="78%" y1="53%" x2="63%" y2="53%" delay={1800} />
      {/* 6 (CONNECTIVITY, diagonal) */}
      <ConnectorLine x1="63%" y1="53%" x2="50%" y2="63%" delay={2000} />

      {/* Node 1: CORE_ENTITY */}
      <div
        className="absolute top-[27%] left-[60%] w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ animationDelay: '1500ms' }}
      />
      <div
        className="absolute top-[11%] left-[26%] anim-slide-left max-w-[160px]"
        style={{ animationDelay: '1100ms' }}
      >
        <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap block">
          [ CORE_ENTITY ]
        </span>
        <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px]">
          Neural node processing real-time data streams.
        </p>
      </div>

      {/* Node 2: LUMINOUS_INSIGHT */}
      <div
        className="absolute top-[58%] left-[32%] w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ animationDelay: '1800ms' }}
      />
      <div
        className="absolute top-[76%] left-[3%] anim-slide-left max-w-[160px]"
        style={{ animationDelay: '1400ms' }}
      >
        <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap block">
          [ LUMINOUS_INSIGHT ]
        </span>
        <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px]">
          Deep-learning engine synthesizing raw inputs.
        </p>
      </div>

      {/* Node 3: CONNECTIVITY */}
      <div
        className="absolute top-[63%] left-[50%] w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ animationDelay: '2100ms' }}
      />
      <div
        className="absolute top-[50%] left-[78%] anim-slide-right max-w-[180px]"
        style={{ animationDelay: '1700ms' }}
      >
        <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap block">
          [ CONNECTIVITY ]
        </span>
        <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px]">
          Latency-free transmission across distributed networks.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Hero Section Component                                       */
/* ------------------------------------------------------------------ */

export function LumenHero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black select-none">
      {/* Layer 0: Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover anim-fade-in pointer-events-none"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {/* Top Navigation */}
        <nav className="absolute top-0 left-0 w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px] z-20">
          {/* Left Group */}
          <div className="flex items-center gap-[40px]">
            <span
              className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              LŪMEN // ÍNDEX
            </span>
            <div className="hidden lg:flex items-center gap-[40px]">
              <NavItem number="01" label="ECOSYSTEM" delay={350} />
              <NavItem number="02" label="LIQUIDITY_POOLS" delay={450} />
              <NavItem number="03" label="LUMEN_INDEX" delay={550} />
              <NavItem number="04" label="GOVERNANCE" delay={650} />
            </div>
          </div>

          {/* Right Group */}
          <div
            className="hidden lg:flex items-center gap-[12px] ml-auto anim-slide-right"
            style={{ animationDelay: '600ms' }}
          >
            <Wallet className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
            <span className="font-manrope text-white text-[13px] leading-[15.6px]">
              0x71...f4e2
            </span>
            <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">
              [ CONNECTED ]
            </span>
            <span className="font-manrope text-white text-[13px] leading-[15.6px] ml-[20px]">
              STATUS:
            </span>
            <span className="bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] text-black font-manrope text-[13px] leading-[15.6px]">
              PRIME_MEMBER
            </span>
          </div>

          {/* Hamburger Button (Mobile / Tablet) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden ml-auto relative w-[40px] h-[40px] flex items-center justify-center anim-fade-in cursor-pointer"
            style={{ animationDelay: '400ms' }}
            aria-label="Toggle menu"
          >
            <span
              className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
              }`}
            >
              <Menu className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
            <span
              className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
              }`}
            >
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
          </button>
        </nav>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            menuOpen ? 'visible' : 'invisible'
          }`}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Panel */}
          <div
            className={`relative h-full flex flex-col px-5 pt-24 pb-10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-5 right-5 w-[40px] h-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </button>

            {/* Nav List */}
            <div className="flex flex-col gap-8">
              {[
                { number: '01', label: 'ECOSYSTEM' },
                { number: '02', label: 'LIQUIDITY_POOLS' },
                { number: '03', label: 'LUMEN_INDEX' },
                { number: '04', label: 'GOVERNANCE' },
              ].map((item, i) => (
                <div
                  key={item.number}
                  className={`flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                    menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
                  }`}
                  style={{
                    transitionDelay: menuOpen ? `${150 + i * 75}ms` : '0ms',
                  }}
                >
                  <span className="font-manrope text-[#AFDDFF]/80 text-[14px] leading-[1]">
                    {item.number}.
                  </span>
                  <span className="font-manrope text-white text-[28px] leading-[1.2] tracking-tight cursor-pointer hover:text-[#AFDDFF] transition-colors">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Wallet Block Pinned to Bottom */}
            <div
              className={`mt-auto pt-10 border-t border-white/10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{
                transitionDelay: menuOpen ? '450ms' : '0ms',
              }}
            >
              <div className="flex items-center gap-[10px] mb-3">
                <Wallet className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
                <span className="font-manrope text-white text-[13px] leading-[15.6px]">
                  0x71...f4e2
                </span>
                <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">
                  [ CONNECTED ]
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <span className="font-manrope text-white text-[13px] leading-[15.6px]">
                  STATUS:
                </span>
                <span className="bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] text-black font-manrope text-[13px] leading-[15.6px]">
                  PRIME_MEMBER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Heading H1 */}
        <h1
          className="font-graphik text-white font-normal leading-[1em] absolute anim-fade-up text-[32px] sm:text-[48px] md:text-[68px] top-[140px] sm:top-[160px] md:top-[178px] left-5 md:left-[35px] max-w-[300px] sm:max-w-[420px] md:max-w-[554px]"
          style={{ animationDelay: '400ms' }}
        >
          Liquid Assets. Luminous Returns.
        </h1>

        {/* Grid Lines + Plus Intersections */}
        <GridLines />

        {/* Central Nodes (Squares + Labels + Connectors) */}
        <CentralNodes />

        {/* Bottom Row */}
        <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0 z-20">
          {/* Left CTA Button */}
          <Link href="/dashboard">
            <button
              className="bg-[#AFDDFF] px-[16px] md:px-[20px] py-[10px] md:py-[12px] flex items-center gap-[10px] hover:bg-[#c8e8ff] transition-colors anim-fade-up cursor-pointer"
              style={{ animationDelay: '900ms' }}
            >
              <span className="text-black text-[16px] leading-none">&#10022;</span>
              <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
                Explore Private Banking
              </span>
            </button>
          </Link>

          {/* Right Info Card */}
          <div
            className="relative max-w-[280px] hidden sm:block anim-slide-right"
            style={{ animationDelay: '1100ms' }}
          >
            <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] px-[6px] py-[2px] inline-block mb-[10px]">
              NOT A BANK — AN ECOSYSTEM
            </span>
            <div className="relative p-[20px]">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 280 168"
                preserveAspectRatio="none"
              >
                <polygon
                  points="0.5,0.5 279.5,0.5 279.5,167.5 30,167.5 0.5,137.5"
                  fill="none"
                  stroke="#AFDDFF"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <p className="relative font-manrope text-white text-[13px] leading-[18px] mb-[18px]">
                Maps the complexity of modern finance with a partner that brings clarity and organic growth to your portfolio.
              </p>
              <span className="relative font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] cursor-pointer hover:underline block">
                VIEW_TRANSPARENCY_REPORT
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
