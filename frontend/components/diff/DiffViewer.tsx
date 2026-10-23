'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDiff, PullRequest } from '@/lib/api';
import {
  PersistedComment,
  PersistedReview,
  PrArchitectureSummary,
  publishReviewToGithub,
  publishSingleCommentToGithub,
} from '@/lib/review-api';
import { useReviewSocket } from '@/hooks/useReviewSocket';
import { PrArchitectureViewer } from '@/components/review/PrArchitectureViewer';
import {
  highlightVsCodeSyntax,
  VsCodeEditorBlock,
} from '@/components/diff/VsCodeSyntaxHighlighter';
import {
  FileCode,
  X,
  Sparkles,
  Check,
  ChevronRight,
  ShieldAlert,
  Bug,
  Lightbulb,
  Info,
  ThumbsUp,
  RotateCw,
  Square,
  Workflow,
  Code2,
  GitPullRequest,
  ExternalLink,
  Loader2,
  Send,
  Menu,
  Minus,
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
  onMinimize?: () => void;
  onStartReview: () => void;
  onStopReview?: () => void;
  onResolve?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  userId?: string;
  onNewComment?: (comment: PersistedComment) => void;
  onCommentResolved?: (data: { commentId: string; resolved: boolean }) => void;
  onCommentUpvoted?: (data: { commentId: string; upvotes: string[] }) => void;
  onReviewComplete?: (data: { totalComments: number }) => void;
  onReviewError?: (data: { reviewId: string; message: string; isHighDemand?: boolean }) => void;
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
  prUrl,
  onResolve,
  onUpvote,
  onPublishToGithub,
  currentUserId,
}: {
  comment: PersistedComment;
  prUrl?: string;
  onResolve?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  onPublishToGithub?: (commentId: string) => Promise<void>;
  currentUserId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const Icon = SEVERITY_ICONS[comment.severity];
  const hasUpvoted = currentUserId ? comment.upvotes.includes(currentUserId) : false;

  const handleCopyFix = () => {
    if (comment.suggestedFix) {
      navigator.clipboard.writeText(comment.suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePublish = async () => {
    if (!onPublishToGithub || isPublishing) return;
    setIsPublishing(true);
    try {
      await onPublishToGithub(comment._id);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <motion.div
      id={`comment-${comment._id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`my-3 mx-4 border p-4 text-xs rounded-lg shadow-md ${
        comment.resolved
          ? 'bg-[#1e1e1e] border-[#333333] text-[#71717a] opacity-75'
          : comment.severity === 'security'
          ? 'bg-[#251f22] border-[#f85149]/60 text-rose-200'
          : comment.severity === 'bug'
          ? 'bg-[#25221b] border-[#d4a017]/60 text-amber-200'
          : 'bg-[#252526] border-[#3a3a3a] text-[#d4d4d4]'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#333333]">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
              comment.severity === 'security'
                ? 'bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/40'
                : comment.severity === 'bug'
                ? 'bg-[#d4a017]/20 text-[#e3b341] border border-[#d4a017]/40'
                : 'bg-[#333333] text-[#d4d4d4]'
            }`}
          >
            {SEVERITY_LABEL[comment.severity]}
          </span>
          <span className="font-mono text-[11px] text-[#858585]">
            Line {comment.lineNumber}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {comment.publishedToGithub && (
            <a
              href={comment.githubCommentUrl || prUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2 py-0.5 rounded hover:bg-emerald-900/40 transition-colors flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              <span>On GitHub ↗</span>
            </a>
          )}
          {comment.resolved && (
            <span className="text-[11px] font-medium text-[#4ec9b0]">
              Resolved
            </span>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="flex items-start gap-2.5 my-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-[#d4d4d4] leading-relaxed flex-1 font-sans whitespace-pre-line">
          {comment.message}
        </div>
      </div>

      {/* Suggested Code Fix rendered in VS Code Editor Theme */}
      {comment.suggestedFix && (
        <div className="mt-3">
          <VsCodeEditorBlock
            code={comment.suggestedFix}
            filename={`fix-L${comment.lineNumber}.ts`}
            onCopy={handleCopyFix}
            copied={copied}
          />
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#333333]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpvote?.(comment._id)}
            className={`h-6 px-2.5 rounded font-mono text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
              hasUpvoted
                ? 'bg-[#007acc] text-white font-semibold'
                : 'bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#a1a1aa] hover:text-white border border-[#3a3a3a]'
            }`}
          >
            <ThumbsUp className="h-3 w-3" />
            <span>{comment.upvotes.length}</span>
          </button>

          {!comment.publishedToGithub && onPublishToGithub && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="h-6 px-2.5 rounded font-mono text-[11px] bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#a1a1aa] hover:text-white border border-[#3a3a3a] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span>Post to GitHub</span>
            </button>
          )}
        </div>

        <button
          onClick={() => onResolve?.(comment._id)}
          className="h-6 px-3 rounded border border-[#3a3a3a] hover:border-white text-white text-xs font-medium bg-[#2d2d2d] hover:bg-[#3c3c3c] transition-all cursor-pointer"
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
  onMinimize,
  onStartReview,
  onStopReview,
  onResolve,
  onUpvote,
  userId,
  onNewComment,
  onCommentResolved,
  onCommentUpvoted,
  onReviewComplete,
  onReviewError,
}: DiffViewerProps) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'diff'>('architecture');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [reviewError, setReviewError] = useState<{ message: string; isHighDemand?: boolean } | null>(null);
  const [localArchitecture, setLocalArchitecture] = useState<PrArchitectureSummary | undefined>(
    currentReview?.architectureSummary
  );

  const [isPublishingReview, setIsPublishingReview] = useState(false);
  const [publishedReviewUrl, setPublishedReviewUrl] = useState<string | null>(
    currentReview?.githubReviewUrl || null
  );
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);
  const [isMobileFileTreeOpen, setIsMobileFileTreeOpen] = useState(false);
  const [targetScrollCommentId, setTargetScrollCommentId] = useState<string | null>(null);

  // Auto-scroll to first comment or target comment when a file is opened
  useEffect(() => {
    if (activeTab !== 'diff' || selectedFileIndex === -1) return;

    // Small delay to ensure diff lines and comment cards are rendered in DOM
    const timer = setTimeout(() => {
      let elementToScroll: HTMLElement | null = null;

      if (targetScrollCommentId) {
        elementToScroll = document.getElementById(`comment-${targetScrollCommentId}`);
      }

      if (!elementToScroll) {
        // Find first comment card in current file if available
        const currentFile = files[selectedFileIndex];
        const firstComment = reviewComments.find((c) => c.filePath === currentFile?.filename);
        if (firstComment) {
          elementToScroll = document.getElementById(`comment-${firstComment._id}`);
        }
      }

      if (elementToScroll) {
        elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If no comment, scroll to top of diff content
        const container = document.getElementById('diff-content-scroll-container');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      setTargetScrollCommentId(null);
    }, 120);

    return () => clearTimeout(timer);
  }, [selectedFileIndex, activeTab]);

  const handleSelectFile = (idx: number) => {
    const targetFile = files[idx];
    const firstComment = targetFile
      ? reviewComments.find((c) => c.filePath === targetFile.filename)
      : null;
    if (firstComment) {
      setTargetScrollCommentId(firstComment._id);
    } else {
      setTargetScrollCommentId(null);
    }
    setSelectedFileIndex(idx);
    setIsMobileFileTreeOpen(false);
  };

  React.useEffect(() => {
    if (currentReview?.architectureSummary) {
      setLocalArchitecture(currentReview.architectureSummary);
    }
    if (currentReview?.githubReviewUrl) {
      setPublishedReviewUrl(currentReview.githubReviewUrl);
    }
    if (currentReview?.status === 'error') {
      setReviewError({
        message:
          currentReview.errorMessage ||
          'Due to heavy traffic on the AI review engine, we cannot review your code at this time. Please try again in a few moments.',
        isHighDemand: true,
      });
    }
  }, [currentReview]);

  const { progress, isStreaming } = useReviewSocket({
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
    onReviewComplete: (data) => {
      onReviewComplete?.(data);
    },
    onReviewError: (data) => {
      setReviewError({
        message: data.message,
        isHighDemand: data.isHighDemand,
      });
      onReviewError?.(data);
    },
  });

  const orphanComments = reviewComments.filter(
    (c) => !files.some((f) => f.filename === c.filePath)
  );

  const isReviewDone =
    !isStreaming &&
    !isReviewing &&
    (currentReview?.status === 'done' ||
      (currentReview && currentReview.status !== 'pending' && currentReview.status !== 'error') ||
      progress?.percent === 100);

  const isOrphanSelected = selectedFileIndex === -1;
  const selectedFile = isOrphanSelected ? null : files[selectedFileIndex] ?? null;
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

  // Publish complete review to GitHub
  const handlePublishReviewToGithub = async () => {
    if (!token || !reviewId || isPublishingReview) return;
    setIsPublishingReview(true);
    setNotification(null);

    try {
      const res = await publishReviewToGithub(token, reviewId);
      setPublishedReviewUrl(res.githubReviewUrl);
      setNotification({
        type: 'success',
        message: `Successfully posted review with ${res.commentsCount} inline suggestions to GitHub!`,
        url: res.githubReviewUrl,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to publish review to GitHub',
      });
    } finally {
      setIsPublishingReview(false);
    }
  };

  // Publish single comment to GitHub
  const handlePublishSingleComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await publishSingleCommentToGithub(token, commentId);
      setNotification({
        type: 'success',
        message: 'Comment posted directly to GitHub PR diff!',
        url: res.githubCommentUrl,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to post comment to GitHub',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-1.5 sm:p-6 text-white">
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

      <div className="flex flex-col h-[98vh] sm:h-full max-h-[98vh] sm:max-h-[94vh] w-full max-w-7xl border border-[#333333] bg-[#1e1e1e] rounded-lg sm:rounded-xl shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="border-b border-[#2d2d2d] bg-[#252526] px-3.5 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-[#cccccc] bg-[#333333] px-2 py-0.5 rounded border border-[#3a3a3a]">
                #{pr.number}
              </span>
              <h2 className="text-sm sm:text-base font-semibold text-[#d4d4d4] truncate max-w-xl tracking-tight">
                {pr.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-[#858585]">
              <span>{files.length} files</span>
              <span className="text-[#4ec9b0]">+{totalAdditions}</span>
              <span className="text-[#f85149]">-{totalDeletions}</span>
              {reviewComments.length > 0 && (
                <span className="text-[#dcdcaa] border-l border-[#3a3a3a] pl-3">
                  {reviewComments.length} audit issues
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Review Controller Buttons */}
            {isStreaming || isReviewing ? (
              <div className="flex items-center gap-2.5">
                <div className="border border-[#3a3a3a] bg-[#1e1e1e] px-3 py-1.5 rounded-lg font-mono text-xs space-y-1 min-w-[190px]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#d4d4d4] font-medium">
                      Auditing {progress?.percent ?? 15}%
                    </span>
                    <span className="text-[#858585]">
                      {progress?.filesReviewed ?? 0}/{progress?.totalFiles ?? files.length}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#252526] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007acc] transition-all duration-300"
                      style={{ width: `${Math.max(5, progress?.percent ?? 15)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#858585] truncate max-w-[170px]">
                    {progress?.stage || 'Analyzing diff...'}
                  </div>
                </div>

                {onStopReview && (
                  <button
                    onClick={onStopReview}
                    className="h-8 px-3 rounded-lg border border-[#f85149]/50 bg-[#372326] text-[#ff7b72] hover:bg-[#48282c] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            ) : currentReview || reviewComments.length > 0 ? (
              <div className="flex items-center gap-2">
                {/* Publish to GitHub Button */}
                {publishedReviewUrl ? (
                  <a
                    href={publishedReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Published on GitHub ↗</span>
                  </a>
                ) : (
                  <button
                    onClick={handlePublishReviewToGithub}
                    disabled={isPublishingReview}
                    className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isPublishingReview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <GitPullRequest className="h-3.5 w-3.5" />
                    )}
                    <span>{isPublishingReview ? 'Posting...' : 'Post to GitHub'}</span>
                  </button>
                )}

                <button
                  onClick={onStartReview}
                  className="h-8 px-3 rounded-lg border border-[#3a3a3a] hover:border-white bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#d4d4d4] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Re-Review</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onStartReview}
                className="h-8 px-4 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start AI Review</span>
              </button>
            )}

            {onMinimize && (
              <button
                onClick={onMinimize}
                title="Run in background (minimize modal)"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#333333] hover:border-white text-[#858585] hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={onClose}
              title={isStreaming || isReviewing ? "Stop review and close" : "Close"}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#333333] hover:border-[#f85149] text-[#858585] hover:text-[#ff7b72] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-5 py-2 text-xs border-b flex items-center justify-between ${
                notification.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{notification.message}</span>
                {notification.url && (
                  <a
                    href={notification.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-semibold flex items-center gap-1 hover:text-white"
                  >
                    <span>View Review on GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selector */}
        <div className="border-b border-[#2d2d2d] bg-[#252526] px-3.5 sm:px-5 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 text-xs font-medium transition-all cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'text-white font-semibold'
                : 'text-[#858585] hover:text-[#d4d4d4]'
            }`}
          >
            <Workflow className="h-3.5 w-3.5" />
            <span>Architecture &amp; Overview</span>
            {activeTab === 'architecture' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#007acc]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`py-2.5 text-xs font-medium transition-all cursor-pointer relative flex items-center gap-2 ${
              activeTab === 'diff'
                ? 'text-white font-semibold'
                : 'text-[#858585] hover:text-[#d4d4d4]'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Unified Diff &amp; Inline Audit</span>
            {reviewComments.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#007acc] text-white rounded-full text-[10px] font-mono">
                {reviewComments.length}
              </span>
            )}
            {activeTab === 'diff' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#007acc]" />
            )}
          </button>
        </div>

        {/* Tab 1: CodeRabbit-Style PR Architecture & Overview */}
        {activeTab === 'architecture' && (
          <div className="flex-1 overflow-y-auto bg-[#1e1e1e]">
            <PrArchitectureViewer
              architecture={localArchitecture}
              isAnalyzing={isStreaming && !localArchitecture}
            />
          </div>
        )}

        {/* Tab 2: Unified Diff & Inline Audit */}
        {activeTab === 'diff' && (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Desktop File Tree Sidebar */}
            <div className="hidden md:flex w-64 lg:w-72 border-r border-[#2d2d2d] bg-[#252526] overflow-y-auto shrink-0 flex-col">
              <div className="px-3 py-2 text-[11px] font-mono text-[#858585] uppercase tracking-wider border-b border-[#2d2d2d]">
                Files Changed ({files.length})
              </div>
              <div className="p-1 space-y-0.5 flex-1 overflow-y-auto">
                {orphanComments.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedFileIndex(-1);
                      setIsMobileFileTreeOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer mb-1 ${
                      isOrphanSelected
                        ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                        : 'text-[#e3b341] hover:bg-[#2a2d2e] bg-[#2a271f]/40 border border-[#e3b341]/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Workflow className="h-3.5 w-3.5 text-[#e3b341] shrink-0" />
                      <span className="truncate font-mono text-[11px] font-semibold">
                        Cross-File &amp; System
                      </span>
                    </div>
                    <span className="bg-[#e3b341] text-black px-1.5 rounded-full font-bold text-[10px]">
                      {orphanComments.length}
                    </span>
                  </button>
                )}
                {files.map((file, idx) => {
                  const fileIssuesCount = reviewComments.filter(
                    (c) => c.filePath === file.filename
                  ).length;
                  const isSelected = selectedFileIndex === idx;

                  return (
                    <button
                      key={file.sha || file.filename}
                      onClick={() => handleSelectFile(idx)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                          : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                        <FileCode className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                        <span className="whitespace-nowrap font-mono text-[11px]">
                          {file.filename}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        {fileIssuesCount > 0 && (
                          <span className="bg-[#f85149] text-white px-1.5 py-0.2 rounded-full font-bold">
                            {fileIssuesCount}
                          </span>
                        )}
                        <span className="text-[#4ec9b0]">+{file.additions}</span>
                        <span className="text-[#f85149]">-{file.deletions}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile / Tablet Drawer Backdrop */}
            <AnimatePresence>
              {isMobileFileTreeOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileFileTreeOpen(false)}
                  className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
                />
              )}
            </AnimatePresence>

            {/* Mobile / Tablet File Tree Drawer */}
            <AnimatePresence>
              {isMobileFileTreeOpen && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.25 }}
                  className="md:hidden absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#1e1e1e] border-r border-[#333333] z-40 flex flex-col shadow-2xl"
                >
                  <div className="p-3 border-b border-[#2d2d2d] bg-[#252526] flex items-center justify-between">
                    <span className="font-mono text-xs text-[#cccccc] font-semibold uppercase tracking-wider">
                      Files Changed ({files.length})
                    </span>
                    <button
                      onClick={() => setIsMobileFileTreeOpen(false)}
                      className="h-7 w-7 rounded flex items-center justify-center text-[#858585] hover:text-white hover:bg-[#333333]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                    {orphanComments.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedFileIndex(-1);
                          setIsMobileFileTreeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer mb-1 ${
                          isOrphanSelected
                            ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                            : 'text-[#e3b341] hover:bg-[#2a2d2e] bg-[#2a271f]/40 border border-[#e3b341]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Workflow className="h-4 w-4 text-[#e3b341] shrink-0" />
                          <span className="font-mono text-xs font-semibold">
                            Cross-File &amp; System
                          </span>
                        </div>
                        <span className="bg-[#e3b341] text-black px-1.5 py-0.5 rounded-full font-bold text-[10px]">
                          {orphanComments.length}
                        </span>
                      </button>
                    )}

                    {files.map((file, idx) => {
                      const fileIssuesCount = reviewComments.filter(
                        (c) => c.filePath === file.filename
                      ).length;
                      const isSelected = selectedFileIndex === idx;

                      return (
                        <button
                          key={file.sha || file.filename}
                          onClick={() => handleSelectFile(idx)}
                          className={`w-full text-left px-3 py-2.5 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                              : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                            <FileCode className="h-4 w-4 text-[#858585] shrink-0" />
                            <span className="whitespace-nowrap font-mono text-xs">
                              {file.filename}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] pl-2">
                            {fileIssuesCount > 0 && (
                              <span className="bg-[#f85149] text-white px-1.5 py-0.5 rounded-full font-bold">
                                {fileIssuesCount}
                              </span>
                            )}
                            <span className="text-[#4ec9b0]">+{file.additions}</span>
                            <span className="text-[#f85149]">-{file.deletions}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Diff Content View */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
              {isOrphanSelected ? (
                <div
                  id="diff-content-scroll-container"
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3"
                >
                  <div className="border-b border-[#2d2d2d] pb-3 mb-2 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-[#d4d4d4] flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-[#e3b341] shrink-0" />
                        <span>Cross-File &amp; Subsystem Integration Findings ({orphanComments.length})</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#858585] mt-1">
                        Issues spanning multiple modules, contract mismatches between services, or system-wide architecture defects.
                      </p>
                    </div>
                    {/* Mobile button to open file drawer */}
                    <button
                      onClick={() => setIsMobileFileTreeOpen(true)}
                      className="md:hidden shrink-0 h-8 px-2.5 rounded border border-[#3a3a3a] bg-[#252526] text-xs font-mono flex items-center gap-1.5"
                    >
                      <Menu className="h-4 w-4" />
                      <span>Files</span>
                    </button>
                  </div>
                  {orphanComments.map((c) => (
                    <CommentCardInline
                      key={c._id}
                      comment={c}
                      prUrl={pr.html_url}
                      onResolve={onResolve}
                      onUpvote={onUpvote}
                      onPublishToGithub={handlePublishSingleComment}
                      currentUserId={userId}
                    />
                  ))}
                </div>
              ) : selectedFile ? (
                <div
                  id="diff-content-scroll-container"
                  className="flex-1 overflow-y-auto"
                >
                  {/* File Header Bar with Hamburger for Mobile */}
                  <div className="sticky top-0 z-10 bg-[#252526] border-b border-[#2d2d2d] px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                      <button
                        onClick={() => setIsMobileFileTreeOpen(true)}
                        className="md:hidden shrink-0 p-1.5 rounded hover:bg-[#333333] text-[#a1a1aa] hover:text-white"
                        title="Toggle Files"
                      >
                        <Menu className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-xs text-[#cccccc] font-medium whitespace-nowrap overflow-x-auto">
                        {selectedFile.filename}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#858585] shrink-0">
                      +{selectedFile.additions} / -{selectedFile.deletions}
                    </span>
                  </div>

                  {/* Diff Lines Table */}
                  <div className="font-mono text-xs leading-5 select-text overflow-x-auto">
                    {diffLines.map((line) => {
                      const lineComments = line.lineNum ? commentsByLine[line.lineNum] : [];

                      return (
                        <React.Fragment key={line.id}>
                          <div
                            className={`flex items-start px-2 py-0.5 hover:bg-white/[0.04] transition-colors ${
                              line.type === 'add'
                                ? 'bg-[#203426] text-[#d4d4d4]'
                                : line.type === 'delete'
                                ? 'bg-[#372326] text-[#d4d4d4]'
                                : line.type === 'hunk'
                                ? 'bg-[#252526] text-[#569cd6] font-semibold py-1'
                                : 'text-[#d4d4d4]'
                            }`}
                          >
                            <span className="w-10 text-right pr-3 select-none text-[#858585] text-[11px] shrink-0">
                              {line.lineNum || ''}
                            </span>
                            <span className="w-4 text-center select-none shrink-0 font-bold">
                              {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                            </span>
                            <span className="flex-1 whitespace-pre-wrap break-all pl-1">
                              {line.type === 'hunk'
                                ? line.content
                                : highlightVsCodeSyntax(line.content.replace(/^[+-]/, ''))}
                            </span>
                          </div>

                          {/* Render Inline AI Comment Cards */}
                          {lineComments && lineComments.length > 0 && (
                            <div className="bg-[#181818] py-1 border-y border-[#333333]">
                              {lineComments.map((c) => (
                                <CommentCardInline
                                  key={c._id}
                                  comment={c}
                                  prUrl={pr.html_url}
                                  onResolve={onResolve}
                                  onUpvote={onUpvote}
                                  onPublishToGithub={handlePublishSingleComment}
                                  currentUserId={userId}
                                />
                              ))}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Render any out-of-hunk or file-level comments */}
                  {(() => {
                    const matchedLines = new Set(diffLines.map((l) => l.lineNum).filter(Boolean));
                    const unmatched = currentComments.filter((c) => !matchedLines.has(c.lineNumber));
                    if (unmatched.length === 0) return null;

                    return (
                      <div className="p-4 border-t border-[#333333] bg-[#141414] space-y-3">
                        <div className="flex items-center gap-2 text-[#a1a1aa] font-mono text-xs">
                          <Bug className="h-4 w-4 text-[#e3b341]" />
                          <span>Additional File-Level Findings ({unmatched.length})</span>
                        </div>
                        {unmatched.map((c) => (
                          <CommentCardInline
                            key={c._id}
                            comment={c}
                            prUrl={pr.html_url}
                            onResolve={onResolve}
                            onUpvote={onUpvote}
                            onPublishToGithub={handlePublishSingleComment}
                            currentUserId={userId}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-[#858585]">
                  Select a file to view unified diff and audit comments
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
