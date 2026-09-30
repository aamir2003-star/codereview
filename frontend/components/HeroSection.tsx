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
  Zap,
} from 'lucide-react';

export function HeroSection() {
  const { user, login } = useAuth();

  // Interactive 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

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
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:pb-32 lg:pt-20 bg-black text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 max-w-2xl space-y-6"
          >
            {/* Monospace Caption Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#262626] bg-[#0d0d0d] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[3px] text-[#999999]">
                ENGINEERING-GRADE AI CODE AUDIT
              </span>
            </div>

            {/* Main Hero Headline (Bugatti Display uppercase, wide tracking) */}
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-normal uppercase tracking-[3px] sm:tracking-[4px] text-white leading-[1.05]">
              PRECISION AI CODE REVIEWS & ARCHITECTURE.
            </h1>

            {/* Serif Body copy */}
            <p className="font-serif text-base sm:text-lg text-[#cccccc] leading-relaxed max-w-xl">
              Connect your GitHub repository. ReviewCopilot synthesizes high-level system architecture, component mutations, and detects subtle logic bugs across pull request diffs in real-time.
            </p>

            {/* CTAs (Bugatti Transparent Pill Buttons) */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <button className="h-11 px-8 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center gap-2">
                    <span>ENTER DASHBOARD</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="h-11 px-8 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center gap-2.5"
                >
                  <GitFork className="h-4 w-4" />
                  <span>CONNECT GITHUB</span>
                </button>
              )}

              <a href="#features">
                <button className="h-11 px-7 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-[#cccccc] hover:text-white font-mono text-xs uppercase tracking-[2px] transition-all cursor-pointer">
                  EXPLORE ARCHITECTURE
                </button>
              </a>
            </div>

            {/* Spec Row (Bugatti Spec-Cell tokens) */}
            <div className="pt-8 border-t border-[#262626] grid grid-cols-3 gap-6 font-mono text-xs">
              <div className="space-y-1">
                <span className="font-display text-2xl font-normal tracking-[2px] text-white">&lt; 3 SEC</span>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#999999]">STREAMING SPEED</p>
              </div>
              <div className="space-y-1">
                <span className="font-display text-2xl font-normal tracking-[2px] text-white">4-TIER</span>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#999999]">SEVERITY TRIAGE</p>
              </div>
              <div className="space-y-1">
                <span className="font-display text-2xl font-normal tracking-[2px] text-white">CODERABBIT</span>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#999999]">AST OVERVIEW</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Holographic Precision Terminal */}
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
              className="relative rounded-none border border-[#262626] bg-[#0d0d0d] p-1 shadow-2xl transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#262626] bg-black px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                  </div>
                  <span className="font-mono text-xs text-[#999999] uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-white" /> auth.controller.ts
                  </span>
                </div>

                <span className="font-mono text-[10px] uppercase tracking-[2px] text-white px-2 py-0.5 border border-[#262626]">
                  AST ACTIVE
                </span>
              </div>

              {/* Code Diff Simulation View */}
              <div className="p-4 font-mono text-xs space-y-1.5 bg-black leading-relaxed select-none">
                <div className="text-[#666666] text-[11px] pb-1">@@ -14,7 +14,9 @@ async function authenticateUser()</div>

                <div className="text-[#999999] px-2"> const token = req.headers.authorization;</div>
                <div className="bg-[#141414] text-[#999999] border-l-2 border-[#3a3a3a] px-2 py-0.5">
                  {"- const user = await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);"}
                </div>

                <div className="bg-[#141414] text-white border-l-2 border-white px-2 py-0.5 font-medium">
                  + const user = await User.findById(req.params.id).select(&#39;-password&#39;);
                </div>

                {/* AI Comment Card 1 */}
                <div className="my-3 border border-white bg-[#0d0d0d] p-3 text-white space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-[#262626] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[1.5px] px-1.5 py-0.5 border border-white">
                        SECURITY AUDIT
                      </span>
                      <span className="text-[10px] font-mono text-[#999999]">LINE 15</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[1px] text-white flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> RESOLVED
                    </span>
                  </div>
                  <p className="font-serif text-xs text-[#cccccc] leading-normal pt-1">
                    SQL injection vulnerability addressed by transitioning to parameterized object query.
                  </p>
                </div>

                <div className="text-[#999999] px-2"> if (!user) return res.status(404).send();</div>
                <div className="bg-[#141414] text-white border-l-2 border-white px-2 py-0.5">
                  {'+ return res.status(200).json({ success: true, user });'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
