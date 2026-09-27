'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/ui/Card3D';
import { Cpu, Users, ShieldCheck, Zap, GitBranch, RefreshCw, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Cpu,
    title: 'Progressive File-by-File Streaming',
    description:
      'Instead of blocking for minutes on entire repositories, Gemini analyzes diff hunks file-by-file and streams comments directly to your screen in real time.',
    badge: 'Gemini 2.0 AI',
    gradient: 'from-emerald-500/20 to-cyan-500/5',
  },
  {
    icon: Users,
    title: 'Multiplayer Real-Time Review Rooms',
    description:
      'Teammates can view the same PR simultaneously. Comments stream live, and reviewers can upvote or resolve issues with zero page refresh.',
    badge: 'Socket.io Sync',
    gradient: 'from-cyan-500/20 to-blue-500/5',
  },
  {
    icon: ShieldCheck,
    title: '4-Tier Categorized Severity Triage',
    description:
      'Identifies critical security vulnerabilities, logical bugs, maintainability code smells, and styling nits with color-coded line markers.',
    badge: 'Security + Lint',
    gradient: 'from-rose-500/20 to-amber-500/5',
  },
  {
    icon: GitBranch,
    title: 'Direct GitHub OAuth Integration',
    description:
      'Connect your GitHub repositories in seconds. Pull requests, branches, and unified diff patches are synced with zero configuration overhead.',
    badge: 'GitHub OAuth',
    gradient: 'from-violet-500/20 to-purple-500/5',
  },
  {
    icon: Zap,
    title: 'Optimistic UI & Low Latency',
    description:
      'Instant interactive feedback when resolving comments or voting on suggestions, backed by immediate server reconciliation.',
    badge: 'Sub-second',
    gradient: 'from-amber-500/20 to-emerald-500/5',
  },
  {
    icon: RefreshCw,
    title: 'MongoDB Review Persistence',
    description:
      'All review sessions, resolutions, and collaborator upvotes are safely persisted in MongoDB so you can revisit past audits at any time.',
    badge: 'MongoDB Atlas',
    gradient: 'from-teal-500/20 to-emerald-500/5',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export function FeatureScroll() {
  return (
    <section id="features" className="py-20 md:py-32 border-t border-neutral-800/60 bg-neutral-950/40 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4"
          >
            <Sparkles className="h-3 w-3" />
            <span>Architecture &amp; Capabilities</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Engineered for high-velocity software teams
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base text-neutral-400"
          >
            Everything you need to turn slow, asynchronous code reviews into fast, intelligent collaborative reviews.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={cardVariants}>
                <Card3D depth={10} className="h-full bg-neutral-900/60 border border-neutral-800 p-6 flex flex-col justify-between backdrop-blur-xl group">
                  {/* Subtle Background Radial Gradient */}
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-md shadow-emerald-500/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded-full border border-neutral-700/60">
                        {feature.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {feature.title}
                    </h3>

                    <p className="mt-2.5 text-xs text-neutral-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-6 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <span>Feature 0{index + 1}</span>
                    <span className="text-emerald-400/80 flex items-center gap-1 group-hover:text-emerald-300 transition-colors">
                      Explore &rarr;
                    </span>
                  </div>
                </Card3D>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
