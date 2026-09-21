'use client';

import React, { useState, useEffect } from 'react';
import { FileDiff, PullRequest } from '@/lib/api';
import { PersistedComment, PersistedReview } from '@/lib/review-api';
import { useReviewSocket } from '@/hooks/useReviewSocket';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
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
  ThumbsUp,
  CheckCircle2,
} from 'lucide-react';

interface DiffViewerProps {
  pr: PullRequest;
  files: FileDiff[];
  isLoading: boolean;
  reviewId?: string | null;
  currentReview?: PersistedReview;
  reviewComments?: PersistedComment[];
  isReviewing?: boolean;
  token: string | null;
  onClose: () => void;
  onStartReview: () => void;
  onResolve?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  userId?: string;
  onCommentsUpdated?: (comments: PersistedComment[]) => void;
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

function CommentCardInline({
  comment,
  onResolve,
  onUpvote,
  currentUserId,
}: {
  comment: PersistedComment;
  onResolve?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  currentUserId?: string;
}) {
  const Icon = SEVERITY_ICONS[comment.severity];
  const hasUpvoted = currentUserId ? comment.upvotes.includes(currentUserId) : false;

  return (
    <div
      className={`my-1.5 mx-3 rounded-xl p-3 border text-xs font-sans shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left-2 ${
        comment.resolved
          ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400 opacity-75'
          : comment.severity === 'security'
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          : comment.severity === 'bug'
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          : comment.severity === 'smell'
          ? 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
          : 'bg-sky-950/30 border-sky-500/40 text-sky-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <Badge variant={comment.severity}>{SEVERITY_LABEL[comment.severity]}</Badge>
          <span className="text-[11px] font-mono text-neutral-400">Line {comment.lineNumber}</span>
          <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Gemini AI
          </span>
        </div>
        {comment.resolved && (
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
          </span>
        )}
      </div>

      <div className="flex items-start gap-2.5 mt-1">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="flex-1 leading-relaxed text-xs">{comment.message}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px]">
        <button
          onClick={() => onUpvote?.(comment._id)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
            hasUpvoted
              ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
              : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800/60'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{comment.upvotes.length}</span>
        </button>

        <button
          onClick={() => onResolve?.(comment._id)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            comment.resolved
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              : 'bg-neutral-800 hover:bg-emerald-600 hover:text-white text-neutral-200'
          }`}
        >
          {comment.resolved ? 'Reopen Issue' : 'Mark as Resolved'}
        </button>
      </div>
    </div>
  );
}

export function DiffViewer({
  pr,
  files,
  isLoading,
  reviewId,
  currentReview,
  reviewComments: initialComments = [],
  isReviewing,
  token,
  onClose,
  onStartReview,
  onResolve,
  onUpvote,
  userId,
  onCommentsUpdated,
}: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [localComments, setLocalComments] = useState<PersistedComment[]>(initialComments);

  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments]);

  // Socket.io Real-Time Streaming Hook
  const { activeUsers, progress, isStreaming } = useReviewSocket({
    reviewId: reviewId ?? null,
    token,
    onNewComment: (newComment) => {
      setLocalComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        const updated = [...prev, newComment];
        onCommentsUpdated?.(updated);
        return updated;
      });
    },
    onCommentResolved: ({ commentId, resolved }) => {
      setLocalComments((prev) => {
        const updated = prev.map((c) => (c._id === commentId ? { ...c, resolved } : c));
        onCommentsUpdated?.(updated);
        return updated;
      });
    },
    onCommentUpvoted: ({ commentId, upvotes }) => {
      setLocalComments((prev) => {
        const updated = prev.map((c) => (c._id === commentId ? { ...c, upvotes } : c));
        onCommentsUpdated?.(updated);
        return updated;
      });
    },
  });

  const selectedFile = files[selectedFileIndex] ?? null;
  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  // Map comments for the currently selected file
  const currentComments = localComments.filter(
    (c) => c.filePath === selectedFile?.filename
  );

  // Build a map from line number → comments
  const commentsByLine = currentComments.reduce<Record<number, PersistedComment[]>>(
    (acc, c) => {
      if (!acc[c.lineNumber]) acc[c.lineNumber] = [];
      acc[c.lineNumber]!.push(c);
      return acc;
    },
    {}
  );

  // Parse patch string into annotated lines
  const parsePatch = (patch?: string) => {
    if (!patch) return [];
    let lineNum = 0;
    return patch.split('\n').map((line, idx) => {
      let type: 'add' | 'delete' | 'hunk' | 'normal' = 'normal';
      if (line.startsWith('@@')) {
        type = 'hunk';
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
                {localComments.length > 0 && (
                  <span className="text-amber-400 font-sans flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {localComments.length} AI issues
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Presence Avatars */}
            <PresenceIndicator users={activeUsers} currentUserId={userId} />

            {isStreaming || isReviewing ? (
              <div className="flex items-center gap-2 rounded-xl bg-neutral-800/80 px-3 py-1.5 text-xs text-emerald-400 font-mono">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Streaming… {progress ? `(${progress.filesReviewed}/${progress.totalFiles || files.length} files)` : ''}
                </span>
              </div>
            ) : currentReview || localComments.length > 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Check className="h-4 w-4" />
                Review complete ({localComments.length} issues)
              </div>
            ) : (
              <Button
                onClick={onStartReview}
                size="sm"
                className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs"
              >
                <Sparkles className="h-4 w-4" />
                Start Live AI Review
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
                const fileComments = localComments.filter((c) => c.filePath === file.filename);
                const hasIssues = fileComments.length > 0;

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
                      {hasIssues && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                          {fileComments.length}
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
                            {/* Inline AI comments with live Socket sync */}
                            {inlineComments.map((comment) => (
                              <CommentCardInline
                                key={comment._id}
                                comment={comment}
                                onResolve={onResolve}
                                onUpvote={onUpvote}
                                currentUserId={userId}
                              />
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
