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
  Sparkles,
} from 'lucide-react';

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
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:pb-32 lg:pt-20 bg-black text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 max-w-2xl space-y-6"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#262626] bg-[#0d0d0d] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              <span className="text-xs text-[#a1a1aa] font-medium">
                AI Code Review &amp; Architecture Engine
              </span>
            </div>

            {/* Main Hero Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.08]">
              Automate PR code reviews with AI precision.
            </h1>

            {/* Body copy */}
            <p className="text-base sm:text-lg text-[#a1a1aa] leading-relaxed max-w-xl">
              Connect your GitHub repository. ReviewCopilot synthesizes high-level system architecture, maps component impact, and traces subtle logic bugs across pull request diffs in real-time.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {user ? (
                <Link href="/dashboard">
                  <button className="h-11 px-6 rounded-xl bg-white text-black hover:bg-[#e4e4e7] font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="h-11 px-6 rounded-xl bg-white text-black hover:bg-[#e4e4e7] font-semibold text-sm transition-all cursor-pointer flex items-center gap-2.5 shadow-sm"
                >
                  <GitFork className="h-4 w-4" />
                  <span>Connect GitHub</span>
                </button>
              )}

              <a href="#features">
                <button className="h-11 px-5 rounded-xl border border-[#3a3a3a] hover:border-white bg-transparent text-[#d4d4d8] hover:text-white text-sm font-medium transition-all cursor-pointer">
                  Explore Capabilities
                </button>
              </a>
            </div>

            {/* Spec Row */}
            <div className="pt-8 border-t border-[#262626] grid grid-cols-3 gap-6 text-xs">
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">&lt; 3s</span>
                <p className="text-xs text-[#71717a]">Streaming Speed</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">4-Tier</span>
                <p className="text-xs text-[#71717a]">Severity Triage</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">CodeRabbit</span>
                <p className="text-xs text-[#71717a]">AST Topology</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Holographic Interactive Terminal */}
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
              className="relative rounded-2xl border border-[#262626] bg-[#0d0d0d] p-1.5 shadow-2xl transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#262626] bg-[#141414] px-4 py-3 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
                  </div>
                  <span className="font-mono text-xs text-[#a1a1aa] flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-white" /> auth.controller.ts
                  </span>
                </div>

                <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                  AI Active
                </span>
              </div>

              {/* Code Diff Simulation View */}
              <div className="p-4 font-mono text-xs space-y-1.5 bg-black rounded-b-xl leading-relaxed select-none">
                <div className="text-[#71717a] text-[11px] pb-1">@@ -14,7 +14,9 @@ async function authenticateUser()</div>

                <div className="text-[#a1a1aa] px-2"> const token = req.headers.authorization;</div>
                <div className="bg-rose-950/20 text-rose-300 border-l-2 border-rose-500 px-2 py-0.5 rounded-r">
                  {"- const user = await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);"}
                </div>

                <div className="bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r">
                  + const user = await User.findById(req.params.id).select(&#39;-password&#39;);
                </div>

                {/* AI Comment Card */}
                <div className="my-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-white space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-500/20 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        Security
                      </span>
                      <span className="text-[11px] font-mono text-[#a1a1aa]">Line 15</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Resolved
                    </span>
                  </div>
                  <p className="text-xs text-[#e4e4e7] leading-normal pt-1 font-sans">
                    SQL injection vulnerability addressed by transitioning to parameterized Mongoose query.
                  </p>
                </div>

                <div className="text-[#a1a1aa] px-2"> if (!user) return res.status(404).send();</div>
                <div className="bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r">
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
