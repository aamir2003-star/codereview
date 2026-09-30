'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Users, ShieldCheck, GitBranch, RefreshCw, Workflow } from 'lucide-react';

const features = [
  {
    icon: Workflow,
    title: 'CodeRabbit PR Architecture & Topology',
    description:
      'Synthesizes high-level system impact, mutated architectural components, sequence flow diagrams, and risk assessments prior to code diff audit.',
    badge: 'System Topology',
  },
  {
    icon: Cpu,
    title: 'Progressive AST & Hunk Streaming',
    description:
      'Instead of blocking for minutes, Gemini analyzes diff hunks file-by-file and streams suggested fixes and line annotations in real time.',
    badge: 'Gemini AI Matrix',
  },
  {
    icon: Users,
    title: 'Multiplayer Real-Time Review Rooms',
    description:
      'Teammates inspect the same PR simultaneously. Comments stream live, and reviewers can upvote or resolve issues with zero page refresh.',
    badge: 'Socket.io Multiplayer',
  },
  {
    icon: ShieldCheck,
    title: '4-Tier Categorized Severity Triage',
    description:
      'Identifies critical security vulnerabilities, runtime logic bugs, maintainability code smells, and precision styling nits with color-coded line markers.',
    badge: 'Security Audit',
  },
  {
    icon: GitBranch,
    title: 'Direct GitHub OAuth Integration',
    description:
      'Connect your GitHub repositories in seconds. Pull requests, branches, and unified diff patches are synced with zero configuration overhead.',
    badge: 'GitHub Sync',
  },
  {
    icon: RefreshCw,
    title: 'MongoDB Review Persistence',
    description:
      'All review sessions, resolutions, suggested fixes, and collaborator upvotes are safely persisted in MongoDB for permanent audit traceability.',
    badge: 'MongoDB Atlas',
  },
];

export function FeatureScroll() {
  return (
    <section id="features" className="py-20 md:py-28 border-t border-[#262626] bg-black relative text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#a1a1aa]">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
            <span>Capabilities &amp; Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Engineered for high-velocity repositories.
          </h2>

          <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed">
            A minimalist, laser-precise code review platform combining Gemini artificial intelligence with real-time multiplayer execution.
          </p>
        </div>

        {/* 3-Up Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className="border border-[#262626] bg-[#0d0d0d] p-6 rounded-xl space-y-3 relative hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#262626] pb-3.5">
                  <span className="font-mono text-xs text-[#a1a1aa]">
                    {feature.badge}
                  </span>
                  <Icon className="h-4 w-4 text-white" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
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
