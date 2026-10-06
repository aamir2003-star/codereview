'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repository } from '@/lib/api';
import { Search, Lock, Globe, Star, ChevronRight, FolderGit2 } from 'lucide-react';

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
  const sortedRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const filteredRepos = sortedRepos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border border-[#262626] bg-[#0d0d0d] rounded-xl overflow-hidden">
      {/* Header & Search Input */}
      <div className="p-4 border-b border-[#262626] bg-[#141414] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white tracking-tight">
              Repositories
            </span>
          </div>
          <span className="font-mono text-xs text-[#a1a1aa] px-2 py-0.5 border border-[#262626] rounded-md">
            {repos.length} repos
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717a]" />
          <input
            type="text"
            placeholder="Filter repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-[#262626] focus:border-[#52525b] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] outline-none transition-colors rounded-lg"
          />
        </div>
      </div>

      {/* Repo Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#262626]">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-14 bg-[#141414] animate-pulse rounded-lg border border-[#262626]" />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#71717a]">
            <span className="text-xs font-medium">No matching repositories</span>
            <p className="text-xs text-[#71717a] mt-1">
              Try a different keyword or check permissions.
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
                  className={`w-full text-left p-3.5 transition-colors duration-150 cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#18181b] text-white'
                      : 'bg-transparent text-[#d4d4d8] hover:bg-[#141414] hover:text-white'
                  }`}
                >
                  {/* Selected Edge Indicator */}
                  {isSelected && (
                    <div className="absolute left-0 inset-y-0 w-0.5 bg-white" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {repo.private ? (
                          <Lock className="h-3 w-3 text-amber-400/80 shrink-0" />
                        ) : (
                          <Globe className="h-3 w-3 text-[#71717a] shrink-0" />
                        )}
                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-[#d4d4d8]'}`}>
                          {repo.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717a] mt-0.5 truncate">
                        {repo.owner.login}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {repo.stargazers_count > 0 && (
                        <span className="font-mono text-[10px] text-[#a1a1aa] flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 text-white fill-white" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-[#52525b]'}`} />
                    </div>
                  </div>

                  {repo.description && (
                    <p className="text-xs text-[#a1a1aa] line-clamp-1 mt-1">
                      {repo.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-[#71717a]">
                    {repo.language && <span>{repo.language}</span>}
                    {repo.open_issues_count > 0 && <span>{repo.open_issues_count} open</span>}
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
