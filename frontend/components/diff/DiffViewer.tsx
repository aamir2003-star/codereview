'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDiff, PullRequest } from '@/lib/api';
import { PersistedComment, PersistedReview, PrArchitectureSummary } from '@/lib/review-api';
import { useReviewSocket } from '@/hooks/useReviewSocket';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import { PrArchitectureViewer } from '@/components/review/PrArchitectureViewer';
import {
  FileCode,
  X,
  Sparkles,
  GitPullRequest,
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
  security: 'SECURITY AUDIT',
  bug: 'LOGIC FLAW',
  smell: 'CODE SMELL',
  nit: 'PRECISION NIT',
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
      transition={{ duration: 0.2 }}
      className={`my-3 mx-4 border p-4 text-xs font-mono rounded-none ${
        comment.resolved
          ? 'bg-[#0d0d0d] border-[#262626] text-[#666666] opacity-75'
          : comment.severity === 'security'
          ? 'bg-[#141414] border-white text-white'
          : comment.severity === 'bug'
          ? 'bg-[#141414] border-[#d4a017] text-[#e6e6e6]'
          : 'bg-[#141414] border-[#3a3a3a] text-[#cccccc]'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[1.5px] px-2 py-0.5 border border-[#3a3a3a] text-white">
            {SEVERITY_LABEL[comment.severity]}
          </span>
          <span className="font-mono text-[10px] text-[#999999] tracking-wider">
            LINE {comment.lineNumber}
          </span>
        </div>
        {comment.resolved && (
          <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-white">
            [RESOLVED]
          </span>
        )}
      </div>

      {/* Message */}
      <div className="flex items-start gap-2.5 my-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5 text-white" />
        <p className="font-serif text-sm text-[#e6e6e6] leading-relaxed flex-1">
          {comment.message}
        </p>
      </div>

      {/* Suggested Code Fix */}
      {comment.suggestedFix && (
        <div className="mt-3 border border-[#262626] bg-black p-3 rounded-none space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[2px] text-[#999999]">
            <span>SUGGESTED CORRECTION</span>
            <button
              onClick={() => {
                if (comment.suggestedFix) {
                  navigator.clipboard.writeText(comment.suggestedFix);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="h-6 px-3 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-white font-mono text-[10px] uppercase tracking-[1.5px] transition-all cursor-pointer flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-white" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>COPY FIX</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-xs font-mono text-white bg-[#0d0d0d] p-3 overflow-x-auto whitespace-pre border border-[#262626] leading-relaxed">
            {comment.suggestedFix}
          </pre>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#262626]">
        <button
          onClick={() => onUpvote?.(comment._id)}
          className={`h-7 px-3 rounded-full border font-mono text-[10px] uppercase tracking-[1.5px] transition-all flex items-center gap-1.5 cursor-pointer ${
            hasUpvoted
              ? 'border-white bg-white text-black'
              : 'border-[#3a3a3a] hover:border-white text-[#999999] hover:text-white bg-transparent'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{comment.upvotes.length}</span>
        </button>

        <button
          onClick={() => onResolve?.(comment._id)}
          className="h-7 px-4 rounded-full border border-[#3a3a3a] hover:border-white text-white font-mono text-[10px] uppercase tracking-[1.5px] bg-transparent transition-all cursor-pointer"
        >
          {comment.resolved ? 'REOPEN ISSUE' : 'MARK AS RESOLVED'}
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

  // Sync with currentReview architecture
  React.useEffect(() => {
    if (currentReview?.architectureSummary) {
      setLocalArchitecture(currentReview.architectureSummary);
    }
  }, [currentReview?.architectureSummary]);

  // Socket.io Real-Time Streaming Hook
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

  // Map comments for the currently selected file
  const currentComments = reviewComments.filter(
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 text-white">
      {/* High Traffic / AI Error Pop-up Modal */}
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

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full max-h-[94vh] w-full max-w-7xl border border-[#262626] bg-black rounded-none shadow-2xl overflow-hidden relative"
      >
        {/* Top Header */}
        <div className="border-b border-[#262626] bg-[#0d0d0d] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[2px] px-2.5 py-0.5 border border-[#3a3a3a] text-white">
                PR #{pr.number}
              </span>
              <h2 className="font-display text-base sm:text-lg font-normal uppercase tracking-[2px] text-white truncate max-w-xl">
                {pr.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[1.5px] text-[#999999]">
              <span>{files.length} FILES</span>
              <span className="text-white">+{totalAdditions}</span>
              <span className="text-[#999999]">-{totalDeletions}</span>
              {reviewComments.length > 0 && (
                <span className="text-white border-l border-[#262626] pl-3">
                  {reviewComments.length} AUDIT ISSUES
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <PresenceIndicator users={activeUsers} currentUserId={userId} />

            {/* Review Controller Buttons */}
            {isStreaming || isReviewing ? (
              <div className="flex items-center gap-3">
                <div className="border border-[#3a3a3a] bg-black px-4 py-2 rounded-none font-mono text-xs space-y-1 min-w-[200px]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="uppercase tracking-[2px] text-white">
                      AUDITING {progress?.percent ?? 15}%
                    </span>
                    <span className="text-[#999999]">
                      {progress?.filesReviewed ?? 0}/{progress?.totalFiles ?? files.length}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#141414] overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${Math.max(5, progress?.percent ?? 15)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#666666] uppercase truncate max-w-[180px]">
                    {progress?.stage || 'NEURAL CORE ACTIVE'}
                  </div>
                </div>

                {onStopReview && (
                  <button
                    onClick={onStopReview}
                    className="h-9 px-4 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-white font-mono text-xs uppercase tracking-[2px] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    <span>ABORT</span>
                  </button>
                )}
              </div>
            ) : currentReview || reviewComments.length > 0 ? (
              <button
                onClick={onStartReview}
                className="h-9 px-5 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>AI REVIEW AGAIN</span>
              </button>
            ) : (
              <button
                onClick={onStartReview}
                className="h-9 px-6 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>START AI REVIEW</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-[#262626] hover:border-white text-[#999999] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector: Architecture vs Diagnostic Diff */}
        <div className="border-b border-[#262626] bg-black px-6 flex items-center gap-8">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3.5 font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer relative ${
              activeTab === 'architecture'
                ? 'text-white font-medium'
                : 'text-[#666666] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Workflow className="h-3.5 w-3.5" />
              ARCHITECTURE & PR OVERVIEW
            </span>
            {activeTab === 'architecture' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`py-3.5 font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer relative ${
              activeTab === 'diff'
                ? 'text-white font-medium'
                : 'text-[#666666] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Code2 className="h-3.5 w-3.5" />
              DIAGNOSTIC DIFF & AUDIT ({reviewComments.length})
            </span>
            {activeTab === 'diff' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white" />
            )}
          </button>
        </div>

        {/* Tab 1: Architecture View */}
        {activeTab === 'architecture' ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-black">
            <PrArchitectureViewer
              architecture={localArchitecture}
              isAnalyzing={isReviewing || isStreaming}
            />
          </div>
        ) : (
          /* Tab 2: Code Diff View */
          <div className="flex flex-1 overflow-hidden divide-x divide-[#262626]">
            {/* File Sidebar */}
            <div className="w-80 bg-[#0d0d0d] flex flex-col overflow-y-auto divide-y divide-[#262626]">
              <div className="p-4 font-mono text-[11px] uppercase tracking-[2px] text-[#999999] flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-white" />
                <span>CHANGED FILES ({files.length})</span>
              </div>

              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#141414] animate-pulse border border-[#262626]" />
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
                      className={`w-full flex items-center justify-between p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#141414] text-white border-l-2 border-white'
                          : 'text-[#cccccc] hover:bg-black hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-white" />
                        <span className="truncate font-mono text-xs uppercase tracking-wider">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2 font-mono text-[10px]">
                        {hasIssues && (
                          <span className="text-white px-1.5 py-0.2 border border-[#3a3a3a]">
                            {fileComments.length}
                          </span>
                        )}
                        <span className="text-white">+{file.additions}</span>
                        <ChevronRight className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-[#666666]'}`} />
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
                  <div className="px-6 py-3 border-b border-[#262626] bg-[#0d0d0d] flex items-center justify-between font-mono text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2 text-white">
                      <span>{selectedFile.filename}</span>
                      <span className="text-[#666666]">[{selectedFile.status}]</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white">+{selectedFile.additions}</span>
                      <span className="text-[#999999]">-{selectedFile.deletions}</span>
                    </div>
                  </div>

                  {/* Code Diff Lines */}
                  <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed select-text p-2">
                    {diffLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-[#666666] p-8">
                        <Check className="h-8 w-8 text-white mb-2" />
                        <span className="font-mono text-xs uppercase tracking-[2px]">BINARY OR EMPTY FILE CHANGE</span>
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
                                    ? 'bg-[#141414] text-white border-l-2 border-white'
                                    : line.type === 'delete'
                                    ? 'bg-[#0d0d0d] text-[#999999] border-l-2 border-[#3a3a3a]'
                                    : line.type === 'hunk'
                                    ? 'bg-[#1a1a1a] text-[#cccccc] font-semibold py-1 border-l-2 border-[#666666]'
                                    : 'text-[#cccccc]'
                                }`}
                              >
                                <span className="w-10 shrink-0 text-[#666666] select-none text-[11px] pr-2 text-right">
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
                <div className="flex items-center justify-center h-full text-[#666666] font-mono text-xs uppercase tracking-[2px]">
                  SELECT A FILE TO INSPECT ITS UNIFIED DIFF
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
