'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repository } from '@/lib/api';
import { Search, Lock, Globe, Star, ChevronRight } from 'lucide-react';

interface RepoListProps {
  repos: Repository[];
  selectedRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  isLoading: boolean;
}

export function RepoList({
  repos,
  selectedRepo,
  onSelectRepo,
  isLoading,
}: RepoListProps) {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border border-[#262626] bg-black rounded-none overflow-hidden">
      {/* Header & Minimalist Underline Input */}
      <div className="p-5 border-b border-[#262626] bg-[#0d0d0d] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm tracking-[3px] text-white font-normal uppercase">
              REPOSITORIES
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#999999] px-2.5 py-0.5 border border-[#262626] rounded-full">
            {repos.length} REPOS
          </span>
        </div>

        {/* Bugatti Text Input (transparent, bottom border only) */}
        <div className="relative">
          <Search className="absolute left-0 top-3 h-3.5 w-3.5 text-[#666666]" />
          <input
            type="text"
            placeholder="FILTER REPOSITORY MATRIX..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-b border-[#3a3a3a] focus:border-white pl-6 pr-2 py-2 font-mono text-xs uppercase tracking-[1.5px] text-white placeholder-[#666666] outline-none transition-colors rounded-none"
          />
        </div>
      </div>

      {/* Repo Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#262626]">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-14 bg-[#141414] animate-pulse border border-[#262626]" />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#999999]">
            <span className="font-mono text-xs uppercase tracking-[2px]">NO MATCHING REPOSITORIES</span>
            <p className="font-serif text-xs text-[#666666] mt-2">
              Refine your filter query or synchronize GitHub account permissions.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRepos.map((repo) => {
              const isSelected = selectedRepo?.id === repo.id;
              return (
                <button
                  key={repo.id}
                  onClick={() => onSelectRepo(repo)}
                  className={`w-full text-left p-4 transition-all duration-150 cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#141414] text-white'
                      : 'bg-black text-[#cccccc] hover:bg-[#0d0d0d] hover:text-white'
                  }`}
                >
                  {/* Selected Edge Indicator */}
                  {isSelected && (
                    <div className="absolute left-0 inset-y-0 w-0.5 bg-white" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {repo.private ? (
                          <Lock className="h-3 w-3 text-[#999999] shrink-0" />
                        ) : (
                          <Globe className="h-3 w-3 text-[#666666] shrink-0" />
                        )}
                        <span className={`font-mono text-xs tracking-[1px] truncate uppercase ${isSelected ? 'text-white font-medium' : 'text-[#cccccc]'}`}>
                          {repo.name}
                        </span>
                      </div>
                      <p className="font-serif text-xs text-[#666666] mt-0.5 truncate">
                        {repo.owner.login}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {repo.stargazers_count > 0 && (
                        <span className="font-mono text-[10px] text-[#999999] flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 text-white fill-white" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      <ChevronRight className={`h-3 w-3 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-white' : 'text-[#666666]'}`} />
                    </div>
                  </div>

                  {repo.description && (
                    <p className="font-serif text-xs text-[#999999] line-clamp-1 mt-1.5 italic">
                      {repo.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[1px] text-[#666666]">
                    {repo.language && <span>{repo.language}</span>}
                    {repo.open_issues_count > 0 && <span>{repo.open_issues_count} OPEN</span>}
                  </div>
                </button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
