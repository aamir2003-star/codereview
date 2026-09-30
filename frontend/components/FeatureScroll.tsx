'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Users, ShieldCheck, GitBranch, RefreshCw, Workflow } from 'lucide-react';

const languageCategories = [
  {
    category: 'Frontend & Web',
    items: 'TypeScript, JavaScript, React (JSX/TSX), Next.js, Vue, Angular, Svelte, HTML5, CSS/Tailwind',
  },
  {
    category: 'Backend & Systems',
    items: 'Python (FastAPI, Django), Go, Rust, Java (Spring), C, C++, C# (.NET), PHP (Laravel), Ruby',
  },
  {
    category: 'Cloud, DevOps & IaC',
    items: 'Dockerfile, Kubernetes YAML, Terraform (HCL), Helm Charts, GitHub Actions workflows',
  },
  {
    category: 'Data & Databases',
    items: 'SQL (Postgres, MySQL, SQLite), Prisma schemas, GraphQL, MongoDB / Mongoose, Bash / Shell',
  },
];

const auditPillars = [
  {
    title: 'OWASP Security Vulnerability Audit',
    badge: 'Security Analysis',
    points: [
      'SQL & NoSQL injection detection in database queries',
      'Cross-Site Scripting (XSS) & unescaped markup inputs',
      'Leaked API keys, credentials, and private tokens in diffs',
      'SSRF, open redirects, and broken authorization (IDOR)',
    ],
  },
  {
    title: 'Runtime & Logic Bug Detection',
    badge: 'Logic & AST',
    points: [
      'Null pointer & undefined dereferences in modified code',
      'Race conditions & unhandled Promise rejections',
      'Memory and resource leaks (unclosed sockets / connections)',
      'Off-by-one boundary errors & flawed conditional logic',
    ],
  },
  {
    title: 'CodeRabbit-Style PR Architecture',
    badge: 'System Topology',
    points: [
      'Synthesizes high-level system impact across all changed files',
      'Maps mutated architectural components and downstream risks',
      'Generates sequence flow diagrams before line-by-line diffs',
      'Color-coded risk triage for fast merge decision-making',
    ],
  },
];

export function FeatureScroll() {
  return (
    <section id="features" className="py-20 md:py-28 border-t border-[#262626] bg-black relative text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Top Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#a1a1aa]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] shadow-[0_0_6px_#007acc]" />
            <span>Verifiable Review Scope</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Comprehensive analysis across 50+ languages.
          </h2>

          <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed">
            Every review runs against unified git diffs with structural code intelligence, delivering line-accurate issue flags and drop-in code patches.
          </p>
        </div>

        {/* 4-Column Supported Languages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {languageCategories.map((cat, idx) => (
            <div
              key={idx}
              className="border border-[#262626] bg-[#0d0d0d] p-5 rounded-xl space-y-2 hover:border-[#3a3a3a] transition-colors"
            >
              <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#007acc]" />
                {cat.category}
              </h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                {cat.items}
              </p>
            </div>
          ))}
        </div>

        {/* 3 Pillars of Review */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {auditPillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="border border-[#262626] bg-[#0d0d0d] p-6 rounded-xl space-y-4 hover:border-[#3a3a3a] transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <span className="font-mono text-xs text-[#a1a1aa]">
                    {pillar.badge}
                  </span>
                  <span className="text-xs font-mono text-[#007acc] font-semibold">
                    0{idx + 1}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight">
                  {pillar.title}
                </h3>

                <ul className="space-y-2 pt-1">
                  {pillar.points.map((pt, pIdx) => (
                    <li key={pIdx} className="text-xs text-[#a1a1aa] flex items-start gap-2 leading-relaxed">
                      <span className="text-[#007acc] font-bold mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
