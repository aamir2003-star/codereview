'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDiff, PullRequest } from '@/lib/api';
import { PersistedComment, PersistedReview, PrArchitectureSummary } from '@/lib/review-api';
import { useReviewSocket } from '@/hooks/useReviewSocket';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import { PrArchitectureViewer } from '@/components/review/PrArchitectureViewer';
import {
  FileCode,
  X,
  Sparkles,
  Check,
  Layers,
  ChevronRight,
  ShieldAlert,
  Bug,
  Lightbulb,
  Info,
  ThumbsUp,
  RotateCw,
  Square,
  Copy,
  Workflow,
  Code2,
} from 'lucide-react';
import { HighTrafficModal } from '@/components/ui/HighTrafficModal';

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
  onStopReview?: () => void;
  onResolve?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  userId?: string;
  onNewComment?: (comment: PersistedComment) => void;
  onCommentResolved?: (data: { commentId: string; resolved: boolean }) => void;
  onCommentUpvoted?: (data: { commentId: string; upvotes: string[] }) => void;
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
  const [copied, setCopied] = useState(false);
  const Icon = SEVERITY_ICONS[comment.severity];
  const hasUpvoted = currentUserId ? comment.upvotes.includes(currentUserId) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`my-2.5 mx-3 border p-3.5 text-xs rounded-lg ${
        comment.resolved
          ? 'bg-[#0d0d0d] border-[#262626] text-[#71717a] opacity-75'
          : comment.severity === 'security'
          ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
          : comment.severity === 'bug'
          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
          : 'bg-[#18181b] border-[#262626] text-[#d4d4d8]'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
              comment.severity === 'security'
                ? 'bg-rose-500/20 text-rose-300'
                : comment.severity === 'bug'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
          >
            {SEVERITY_LABEL[comment.severity]}
          </span>
          <span className="font-mono text-[11px] text-[#71717a]">
            Line {comment.lineNumber}
          </span>
        </div>
        {comment.resolved && (
          <span className="text-[11px] font-medium text-emerald-400">
            Resolved
          </span>
        )}
      </div>

      {/* Message */}
      <div className="flex items-start gap-2 my-1.5">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[#e4e4e7] leading-relaxed flex-1">
          {comment.message}
        </p>
      </div>

      {/* Suggested Code Fix */}
      {comment.suggestedFix && (
        <div className="mt-2.5 border border-[#262626] bg-black p-2.5 rounded-md space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>Suggested Fix</span>
            <button
              onClick={() => {
                if (comment.suggestedFix) {
                  navigator.clipboard.writeText(comment.suggestedFix);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="h-6 px-2.5 rounded border border-[#3a3a3a] hover:border-white bg-[#18181b] text-white text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Fix</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-300 bg-[#0d0d0d] p-2.5 rounded overflow-x-auto whitespace-pre border border-[#262626] leading-relaxed">
            {comment.suggestedFix}
          </pre>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#262626]">
        <button
          onClick={() => onUpvote?.(comment._id)}
          className={`h-6 px-2.5 rounded font-mono text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
            hasUpvoted
              ? 'bg-white text-black font-semibold'
              : 'bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border border-[#262626]'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{comment.upvotes.length}</span>
        </button>

        <button
          onClick={() => onResolve?.(comment._id)}
          className="h-6 px-3 rounded border border-[#3a3a3a] hover:border-white text-white text-xs font-medium bg-transparent hover:bg-[#18181b] transition-all cursor-pointer"
        >
          {comment.resolved ? 'Reopen' : 'Mark Resolved'}
        </button>
      </div>
    </motion.div>
  );
}

export function DiffViewer({
  pr,
  files,
  isLoading,
  reviewId,
  currentReview,
  reviewComments = [],
  isReviewing,
  token,
  onClose,
  onStartReview,
  onStopReview,
  onResolve,
  onUpvote,
  userId,
  onNewComment,
  onCommentResolved,
  onCommentUpvoted,
}: DiffViewerProps) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'diff'>('architecture');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [reviewError, setReviewError] = useState<{ message: string; isHighDemand?: boolean } | null>(null);
  const [localArchitecture, setLocalArchitecture] = useState<PrArchitectureSummary | undefined>(
    currentReview?.architectureSummary
  );

  React.useEffect(() => {
    if (currentReview?.architectureSummary) {
      setLocalArchitecture(currentReview.architectureSummary);
    }
  }, [currentReview?.architectureSummary]);

  const { activeUsers, progress, isStreaming } = useReviewSocket({
    reviewId: reviewId ?? null,
    token,
    onNewComment: (newComment) => {
      onNewComment?.(newComment);
    },
    onCommentResolved: (data) => {
      onCommentResolved?.(data);
    },
    onCommentUpvoted: (data) => {
      onCommentUpvoted?.(data);
    },
    onArchitectureSummary: (data) => {
      setLocalArchitecture(data.architecture);
    },
    onReviewError: (data) => {
      setReviewError({
        message: data.message,
        isHighDemand: data.isHighDemand,
      });
    },
  });

  const selectedFile = files[selectedFileIndex] ?? null;
  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  const currentComments = reviewComments.filter(
    (c) => c.filePath === selectedFile?.filename
  );

  const commentsByLine = currentComments.reduce<Record<number, PersistedComment[]>>(
    (acc, c) => {
      if (!acc[c.lineNumber]) acc[c.lineNumber] = [];
      acc[c.lineNumber]!.push(c);
      return acc;
    },
    {}
  );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 text-white">
      <HighTrafficModal
        isOpen={!!reviewError}
        message={reviewError?.message}
        isHighDemand={reviewError?.isHighDemand}
        onRetry={() => {
          setReviewError(null);
          onStartReview();
        }}
        onClose={() => setReviewError(null)}
      />

      <div className="flex flex-col h-full max-h-[94vh] w-full max-w-7xl border border-[#262626] bg-[#0d0d0d] rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="border-b border-[#262626] bg-[#141414] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-[#a1a1aa] bg-[#18181b] px-2 py-0.5 rounded border border-[#262626]">
                #{pr.number}
              </span>
              <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-xl tracking-tight">
                {pr.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-[#71717a]">
              <span>{files.length} files</span>
              <span className="text-emerald-400">+{totalAdditions}</span>
              <span className="text-rose-400">-{totalDeletions}</span>
              {reviewComments.length > 0 && (
                <span className="text-amber-400 border-l border-[#262626] pl-3">
                  {reviewComments.length} audit issues
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PresenceIndicator users={activeUsers} currentUserId={userId} />

            {/* Review Controller Buttons */}
            {isStreaming || isReviewing ? (
              <div className="flex items-center gap-2.5">
                <div className="border border-[#262626] bg-black px-3 py-1.5 rounded-lg font-mono text-xs space-y-1 min-w-[190px]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white font-medium">
                      Auditing {progress?.percent ?? 15}%
                    </span>
                    <span className="text-[#71717a]">
                      {progress?.filesReviewed ?? 0}/{progress?.totalFiles ?? files.length}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#18181b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${Math.max(5, progress?.percent ?? 15)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#71717a] truncate max-w-[170px]">
                    {progress?.stage || 'Analyzing diff...'}
                  </div>
                </div>

                {onStopReview && (
                  <button
                    onClick={onStopReview}
                    className="h-8 px-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            ) : currentReview || reviewComments.length > 0 ? (
              <button
                onClick={onStartReview}
                className="h-8 px-3.5 rounded-lg border border-[#3a3a3a] hover:border-white bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>AI Review Again</span>
              </button>
            ) : (
              <button
                onClick={onStartReview}
                className="h-8 px-4 rounded-lg bg-white hover:bg-[#e4e4e7] text-black text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start AI Review</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#262626] hover:border-white text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="border-b border-[#262626] bg-[#0d0d0d] px-5 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 text-xs font-medium transition-all cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'text-white font-semibold'
                : 'text-[#71717a] hover:text-white'
            }`}
          >
            <Workflow className="h-3.5 w-3.5" />
            <span>Architecture &amp; Overview</span>
            {activeTab === 'architecture' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`py-3 text-xs font-medium transition-all cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'diff'
                ? 'text-white font-semibold'
                : 'text-[#71717a] hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Diagnostic Diff ({reviewComments.length})</span>
            {activeTab === 'diff' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white" />
            )}
          </button>
        </div>

        {/* Tab 1: Architecture View */}
        {activeTab === 'architecture' ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-[#0d0d0d]">
            <PrArchitectureViewer
              architecture={localArchitecture}
              isAnalyzing={isReviewing || isStreaming}
            />
          </div>
        ) : (
          /* Tab 2: Code Diff View */
          <div className="flex flex-1 overflow-hidden divide-x divide-[#262626]">
            {/* File Sidebar */}
            <div className="w-72 bg-[#141414] flex flex-col overflow-y-auto divide-y divide-[#262626]">
              <div className="p-3.5 font-mono text-xs text-[#a1a1aa] flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-white" />
                <span>Changed Files ({files.length})</span>
              </div>

              {isLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#18181b] animate-pulse rounded-md" />
                  ))}
                </div>
              ) : (
                files.map((file, idx) => {
                  const isSelected = selectedFileIndex === idx;
                  const fileComments = reviewComments.filter((c) => c.filePath === file.filename);
                  const hasIssues = fileComments.length > 0;

                  return (
                    <button
                      key={file.sha || idx}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#18181b] text-white font-medium border-l-2 border-white'
                          : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-white" />
                        <span className="truncate font-mono text-xs">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 font-mono text-[10px]">
                        {hasIssues && (
                          <span className="text-amber-400 bg-amber-950/30 border border-amber-500/40 px-1 rounded">
                            {fileComments.length}
                          </span>
                        )}
                        <span className="text-emerald-400">+{file.additions}</span>
                        <ChevronRight className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-[#52525b]'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Diff Viewer Body */}
            <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
              {selectedFile ? (
                <>
                  {/* File Header */}
                  <div className="px-5 py-2.5 border-b border-[#262626] bg-[#141414] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2 text-white">
                      <span>{selectedFile.filename}</span>
                      <span className="text-[#71717a]">[{selectedFile.status}]</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400">+{selectedFile.additions}</span>
                      <span className="text-rose-400">-{selectedFile.deletions}</span>
                    </div>
                  </div>

                  {/* Code Diff Lines */}
                  <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed select-text p-2">
                    {diffLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-[#71717a] p-8">
                        <Check className="h-8 w-8 text-white mb-2" />
                        <span className="text-xs">Binary or empty file change</span>
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
                                    ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                                    : line.type === 'delete'
                                    ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500'
                                    : line.type === 'hunk'
                                    ? 'bg-[#18181b] text-cyan-300 font-semibold py-1 border-l-2 border-cyan-500'
                                    : 'text-[#d4d4d8]'
                                }`}
                              >
                                <span className="w-10 shrink-0 text-[#71717a] select-none text-[11px] pr-2 text-right">
                                  {line.type !== 'hunk' && line.type !== 'delete' ? line.lineNum : ''}
                                </span>
                                <span className="whitespace-pre-wrap font-mono text-xs break-all">
                                  {line.content}
                                </span>
                              </div>

                              {/* Inline AI Comments */}
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
                <div className="flex items-center justify-center h-full text-[#71717a] text-xs">
                  Select a file to inspect diff
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
