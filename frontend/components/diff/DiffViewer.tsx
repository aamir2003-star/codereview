'use client';

import React, { useState } from 'react';
import { FileDiff, PullRequest } from '@/lib/api';
import { GeminiComment, FileReviewResult } from '@/lib/review-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileCode,
  X,
  Sparkles,
  GitPullRequest,
  Check,
  Layers,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Bug,
  Lightbulb,
  Info,
  AlertCircle,
} from 'lucide-react';

interface DiffViewerProps {
  pr: PullRequest;
  files: FileDiff[];
  isLoading: boolean;
  reviewResults?: FileReviewResult[];
  isReviewing?: boolean;
  onClose: () => void;
  onStartReview: () => void;
}

const SEVERITY_ICONS = {
  security: ShieldAlert,
  bug: Bug,
  smell: Lightbulb,
  nit: Info,
};

const SEVERITY_LABEL = {
  security: 'Security',
  bug: 'Bug',
  smell: 'Code Smell',
  nit: 'Nit',
};

function CommentInline({ comment }: { comment: GeminiComment }) {
  const Icon = SEVERITY_ICONS[comment.severity];
  const variantMap: Record<string, 'security' | 'bug' | 'smell' | 'nit'> = {
    security: 'security',
    bug: 'bug',
    smell: 'smell',
    nit: 'nit',
  };

  return (
    <div
      className={`flex items-start gap-2.5 my-1 mx-3 rounded-xl px-3 py-2.5 border text-xs font-sans animate-in fade-in slide-in-from-left-2 duration-300 ${
        comment.severity === 'security'
          ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          : comment.severity === 'bug'
          ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          : comment.severity === 'smell'
          ? 'bg-yellow-950/30 border-yellow-500/30 text-yellow-200'
          : 'bg-sky-950/30 border-sky-500/30 text-sky-200'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant={variantMap[comment.severity]}>{SEVERITY_LABEL[comment.severity]}</Badge>
          <span className="text-[10px] font-mono opacity-60">Line {comment.line}</span>
          <span className="text-[10px] opacity-40 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Gemini AI
          </span>
        </div>
        <p className="leading-relaxed">{comment.message}</p>
      </div>
    </div>
  );
}

export function DiffViewer({
  pr,
  files,
  isLoading,
  reviewResults,
  isReviewing,
  onClose,
  onStartReview,
}: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const selectedFile = files[selectedFileIndex] ?? null;
  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  // Map comments for the currently selected file
  const currentFileResult = reviewResults?.find(
    (r) => r.filename === selectedFile?.filename
  );
  const currentComments = currentFileResult?.comments ?? [];

  // Build a map from line number → comments
  const commentsByLine = currentComments.reduce<Record<number, GeminiComment[]>>(
    (acc, c) => {
      if (!acc[c.line]) acc[c.line] = [];
      acc[c.line]!.push(c);
      return acc;
    },
    {}
  );

  // Count total comments across all files
  const totalReviewComments = reviewResults?.reduce((sum, r) => sum + r.comments.length, 0) ?? 0;

  // Parse patch string into annotated lines
  const parsePatch = (patch?: string) => {
    if (!patch) return [];
    let lineNum = 0;
    return patch.split('\n').map((line, idx) => {
      let type: 'add' | 'delete' | 'hunk' | 'normal' = 'normal';
      if (line.startsWith('@@')) {
        type = 'hunk';
        // Extract the new-file start line from the hunk header
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
        if (match?.[1]) lineNum = parseInt(match[1], 10) - 1;
      } else if (line.startsWith('+')) {
        type = 'add';
        lineNum++;
      } else if (line.startsWith('-')) {
        type = 'delete';
      } else {
        lineNum++;
      }
      return { id: idx, type, content: line, lineNum };
    });
  };

  const diffLines = parsePatch(selectedFile?.patch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="flex flex-col h-full max-h-[92vh] w-full max-w-6xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-emerald-400">#{pr.number}</span>
                <h2 className="text-sm font-bold text-white truncate max-w-md">{pr.title}</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-0.5">
                <span>{files.length} files</span>
                <span className="text-emerald-400">+{totalAdditions}</span>
                <span className="text-rose-400">-{totalDeletions}</span>
                {totalReviewComments > 0 && (
                  <span className="text-amber-400 font-sans flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {totalReviewComments} AI issues
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isReviewing ? (
              <Button size="sm" disabled className="gap-2 bg-neutral-800 text-neutral-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reviewing…
              </Button>
            ) : reviewResults ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Check className="h-4 w-4" />
                Review complete
              </div>
            ) : (
              <Button
                onClick={onStartReview}
                size="sm"
                className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs"
              >
                <Sparkles className="h-4 w-4" />
                Start AI Review
              </Button>
            )}
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
                const fileResult = reviewResults?.find((r) => r.filename === file.filename);
                const hasIssues = (fileResult?.comments?.length ?? 0) > 0;
                const isError = fileResult?.status === 'error';

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
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isError && (
                        <AlertCircle className="h-3.5 w-3.5 text-rose-400" title="Review failed for this file" />
                      )}
                      {hasIssues && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                          {fileResult!.comments.length}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-emerald-400">+{file.additions}</span>
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
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">+{selectedFile.additions}</span>
                    <span className="text-rose-400">-{selectedFile.deletions}</span>
                    {currentFileResult?.status === 'error' && (
                      <span className="text-rose-300 font-sans text-[11px] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Couldn&apos;t review this file
                      </span>
                    )}
                  </div>
                </div>

                {/* Code Diff Body */}
                <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed select-text">
                  {diffLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 p-8">
                      <Check className="h-8 w-8 text-emerald-400 mb-2 opacity-60" />
                      <p>Binary or empty file change</p>
                    </div>
                  ) : (
                    <div>
                      {diffLines.map((line) => {
                        const inlineComments = commentsByLine[line.lineNum] ?? [];
                        return (
                          <React.Fragment key={line.id}>
                            <div
                              className={`flex items-start px-3 py-0.5 ${
                                line.type === 'add'
                                  ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                                  : line.type === 'delete'
                                  ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                                  : line.type === 'hunk'
                                  ? 'bg-cyan-950/30 text-cyan-400 border-l-2 border-cyan-500 font-semibold py-1'
                                  : 'text-neutral-300'
                              }`}
                            >
                              <span className="w-10 shrink-0 text-neutral-500 select-none text-[11px] pr-2 text-right">
                                {line.type !== 'hunk' && line.type !== 'delete' ? line.lineNum : ''}
                              </span>
                              <span className="whitespace-pre-wrap font-mono text-xs break-all">
                                {line.content}
                              </span>
                            </div>
                            {/* Inline AI comments after this line */}
                            {inlineComments.map((comment, ci) => (
                              <CommentInline key={`${line.lineNum}-${ci}`} comment={comment} />
                            ))}
                          </React.Fragment>
                        );
                      })}
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
