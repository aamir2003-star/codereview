'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Users, ShieldCheck, Zap, GitBranch, RefreshCw, Workflow } from 'lucide-react';

const features = [
  {
    icon: Workflow,
    title: 'CodeRabbit PR Architecture & Topology',
    description:
      'Synthesizes high-level system impact, mutated architectural components, sequence flow diagrams, and risk assessments prior to code diff audit.',
    badge: 'SYSTEM TOPOLOGY',
  },
  {
    icon: Cpu,
    title: 'Progressive AST & Hunk Streaming',
    description:
      'Instead of blocking for minutes, Gemini analyzes diff hunks file-by-file and streams suggested fixes and line annotations in real time.',
    badge: 'GEMINI FLASH MATRIX',
  },
  {
    icon: Users,
    title: 'Multiplayer Real-Time Review Rooms',
    description:
      'Teammates inspect the same PR simultaneously. Comments stream live, and reviewers can upvote or resolve issues with zero page refresh.',
    badge: 'SOCKET.IO MULTIPLAYER',
  },
  {
    icon: ShieldCheck,
    title: '4-Tier Categorized Severity Triage',
    description:
      'Identifies critical security vulnerabilities, runtime logic bugs, maintainability code smells, and precision styling nits with color-coded line markers.',
    badge: 'SECURITY AUDIT',
  },
  {
    icon: GitBranch,
    title: 'Direct GitHub OAuth Integration',
    description:
      'Connect your GitHub repositories in seconds. Pull requests, branches, and unified diff patches are synced with zero configuration overhead.',
    badge: 'GITHUB SYNC',
  },
  {
    icon: RefreshCw,
    title: 'MongoDB Review Persistence',
    description:
      'All review sessions, resolutions, suggested fixes, and collaborator upvotes are safely persisted in MongoDB for permanent audit traceability.',
    badge: 'MONGODB ATLAS',
  },
];

export function FeatureScroll() {
  return (
    <section id="features" className="py-24 md:py-32 border-t border-[#262626] bg-black relative text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
            <span>CAPABILITIES & ARCHITECTURE</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-normal uppercase tracking-[3px] text-white leading-tight">
            ENGINEERED FOR HIGH-VELOCITY REPOSITORIES.
          </h2>

          <p className="font-serif text-base text-[#cccccc] leading-relaxed max-w-xl">
            A minimalist, laser-precise code review platform combining Gemini artificial intelligence with real-time multiplayer execution.
          </p>
        </div>

        {/* 2-Up Grid (Bugatti Newsroom/Card Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="border border-[#262626] bg-[#0d0d0d] p-6 sm:p-8 rounded-none space-y-4 relative hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#262626] pb-4">
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#999999]">
                    {feature.badge}
                  </span>
                  <Icon className="h-4 w-4 text-white" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-lg font-normal uppercase tracking-[1.5px] text-white">
                    {feature.title}
                  </h3>
                  <p className="font-serif text-sm text-[#cccccc] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
