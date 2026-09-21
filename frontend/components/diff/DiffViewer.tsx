'use client';

import React, { useState } from 'react';
import { FileDiff, PullRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  FileCode,
  X,
  Sparkles,
  GitPullRequest,
  Check,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface DiffViewerProps {
  pr: PullRequest;
  files: FileDiff[];
  isLoading: boolean;
  onClose: () => void;
  onStartReview: () => void;
}

export function DiffViewer({
  pr,
  files,
  isLoading,
  onClose,
  onStartReview,
}: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const selectedFile = files[selectedFileIndex] || null;

  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  // Parse patch string into lines
  const parsePatch = (patch?: string) => {
    if (!patch) return [];
    return patch.split('\n').map((line, idx) => {
      let type: 'add' | 'delete' | 'hunk' | 'normal' = 'normal';
      if (line.startsWith('@@')) type = 'hunk';
      else if (line.startsWith('+')) type = 'add';
      else if (line.startsWith('-')) type = 'delete';

      return {
        id: idx,
        type,
        content: line,
      };
    });
  };

  const diffLines = parsePatch(selectedFile?.patch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="flex flex-col h-full max-h-[90vh] w-full max-w-6xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  #{pr.number}
                </span>
                <h2 className="text-sm font-bold text-white truncate max-w-md">
                  {pr.title}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-0.5">
                <span>{files.length} changed files</span>
                <span className="text-emerald-400">+{totalAdditions}</span>
                <span className="text-rose-400">-{totalDeletions}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onStartReview}
              size="sm"
              className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Start AI Review</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-neutral-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 overflow-hidden divide-x divide-neutral-800/80">
          {/* File Sidebar */}
          <div className="w-72 bg-neutral-900/30 flex flex-col overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span>Changed Files ({files.length})</span>
            </div>

            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-neutral-800/40 animate-pulse" />
                ))}
              </div>
            ) : (
              files.map((file, idx) => {
                const isSelected = selectedFileIndex === idx;
                return (
                  <button
                    key={file.sha || idx}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-medium shadow-sm'
                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate text-xs font-mono">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono shrink-0 ml-2">
                      <span className="text-emerald-400">+{file.additions}</span>
                      <span className="text-rose-400">-{file.deletions}</span>
                      <ChevronRight className="h-3 w-3 text-neutral-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Diff Content Viewer */}
          <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
            {selectedFile ? (
              <>
                {/* File Header */}
                <div className="px-6 py-3 border-b border-neutral-800/60 bg-neutral-900/40 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <span className="font-semibold text-white">{selectedFile.filename}</span>
                    <span className="text-neutral-400">({selectedFile.status})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">+{selectedFile.additions}</span>
                    <span className="text-rose-400">-{selectedFile.deletions}</span>
                  </div>
                </div>

                {/* Code Diff Body */}
                <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
                  {diffLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 p-8">
                      <Check className="h-8 w-8 text-emerald-400 mb-2 opacity-60" />
                      <p>Binary or empty file change</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {diffLines.map((line) => (
                        <div
                          key={line.id}
                          className={`flex items-start px-3 py-1 rounded-sm ${
                            line.type === 'add'
                              ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                              : line.type === 'delete'
                              ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                              : line.type === 'hunk'
                              ? 'bg-cyan-950/30 text-cyan-400 border-l-2 border-cyan-500 font-semibold'
                              : 'text-neutral-300'
                          }`}
                        >
                          <span className="w-8 shrink-0 text-neutral-400 select-none text-[11px]">
                            {line.id + 1}
                          </span>
                          <span className="whitespace-pre-wrap font-mono text-xs">{line.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
                Select a file to inspect its diff
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
