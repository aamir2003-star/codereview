'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowRight,
  GitFork,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { highlightVsCodeSyntax } from '@/components/diff/VsCodeSyntaxHighlighter';

export function HeroSection() {
  const { user, login } = useAuth();

  // Interactive 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:pb-32 lg:pt-20 bg-black text-white min-h-[90vh] flex items-center">
      {/* Background Video Layer */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40 z-0 anim-fade-in"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Subtle Vignette & Scrim Gradient for Readability */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-black" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-radial-gradient from-transparent via-black/20 to-black" />

      <div className="mx-auto max-w-7xl relative z-10 w-full">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 max-w-2xl space-y-6"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] shadow-[0_0_6px_#007acc]" />
              <span className="text-xs text-[#a1a1aa] font-medium tracking-wide">
                AI Code Review Engine
              </span>
            </div>

            {/* Main Hero Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.08]">
              Code Review,
              <br />
              Without the Guesswork.
            </h1>

            {/* Body copy */}
            <p className="text-base sm:text-lg text-[#a1a1aa] leading-relaxed max-w-xl">
              Understand every change. Catch problems earlier. Ship with confidence. ReviewCopilot maps PR architecture, detects security vulnerabilities, and generates line-accurate fixes across 50+ languages.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {user ? (
                <Link href="/dashboard">
                  <button className="h-11 px-6 rounded-xl bg-white text-black hover:bg-[#e4e4e7] font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                    <span>Start Reviewing</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="h-11 px-6 rounded-xl bg-white text-black hover:bg-[#e4e4e7] font-semibold text-sm transition-all cursor-pointer flex items-center gap-2.5 shadow-sm"
                >
                  <GitFork className="h-4 w-4" />
                  <span>Start Reviewing</span>
                </button>
              )}

              <a href="#features">
                <button className="h-11 px-5 rounded-xl border border-[#3a3a3a] hover:border-white bg-black/40 backdrop-blur-md text-[#d4d4d8] hover:text-white text-sm font-medium transition-all cursor-pointer">
                  See How It Works
                </button>
              </a>
            </div>

            {/* Verified Capabilities Row */}
            <div className="pt-8 border-t border-[#262626] grid grid-cols-3 gap-6 text-xs">
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">50+</span>
                <p className="text-xs text-[#71717a]">Languages &amp; IaC</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">OWASP</span>
                <p className="text-xs text-[#71717a]">Security &amp; Logic Bugs</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">PR System</span>
                <p className="text-xs text-[#71717a]">Architecture &amp; Flow</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Holographic Interactive VS Code Terminal */}
          <div
            className="lg:col-span-6 [perspective:1400px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <motion.div
              style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }}
              className="relative rounded-xl border border-[#333333] bg-[#1e1e1e] p-0.5 shadow-2xl transition-all duration-200"
            >
              {/* VS Code Window Header */}
              <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-4 py-2.5 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="font-mono text-xs text-[#cccccc] flex items-center gap-1.5 ml-2">
                    <Terminal className="h-3.5 w-3.5 text-[#007acc]" /> auth.controller.ts (Diff)
                  </span>
                </div>

                <span className="font-mono text-[11px] text-[#4ec9b0] bg-[#4ec9b0]/10 px-2 py-0.5 rounded border border-[#4ec9b0]/30">
                  AST Active
                </span>
              </div>

              {/* Code Diff Simulation View */}
              <div className="p-3 font-mono text-[12px] leading-5 bg-[#1e1e1e] rounded-b-xl select-none">
                <div className="text-[#569cd6] text-[11px] pb-1.5 bg-[#252526] px-2 py-0.5 rounded border-l-2 border-[#007acc] mb-1">
                  @@ -14,7 +14,9 @@ async function authenticateUser()
                </div>

                <div className="flex items-start text-[#d4d4d4] px-1 py-0.5">
                  <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">13</span>
                  <span className="whitespace-pre">{highlightVsCodeSyntax('const token = req.headers.authorization;')}</span>
                </div>

                <div className="flex items-start bg-[#372326] border-l-[3px] border-[#f85149] px-1 py-0.5 text-[#d4d4d4]">
                  <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">-</span>
                  <span className="whitespace-pre">{highlightVsCodeSyntax("const user = await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);")}</span>
                </div>

                <div className="flex items-start bg-[#203426] border-l-[3px] border-[#2ea043] px-1 py-0.5 text-[#d4d4d4]">
                  <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">+</span>
                  <span className="whitespace-pre">{highlightVsCodeSyntax("const user = await User.findById(req.params.id).select('-password');")}</span>
                </div>

                {/* AI Comment Card in VS Code Style */}
                <div className="my-2.5 rounded border border-[#f85149]/40 bg-[#251f22] p-3 text-white space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-[#333333] pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/40">
                        Security
                      </span>
                      <span className="text-[11px] font-mono text-[#858585]">Line 15</span>
                    </div>
                    <span className="text-[11px] text-[#4ec9b0] flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Resolved
                    </span>
                  </div>
                  <p className="text-xs text-[#d4d4d4] leading-normal pt-1 font-sans">
                    SQL injection vulnerability addressed by transitioning to parameterized Mongoose query.
                  </p>
                </div>

                <div className="flex items-start text-[#d4d4d4] px-1 py-0.5">
                  <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">16</span>
                  <span className="whitespace-pre">{highlightVsCodeSyntax('if (!user) return res.status(404).send();')}</span>
                </div>

                <div className="flex items-start bg-[#203426] border-l-[3px] border-[#2ea043] px-1 py-0.5 text-[#d4d4d4]">
                  <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">+</span>
                  <span className="whitespace-pre">{highlightVsCodeSyntax('return res.status(200).json({ success: true, user });')}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
