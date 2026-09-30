'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDiff, PullRequest } from '@/lib/api';
import { PersistedComment, PersistedReview, PrArchitectureSummary } from '@/lib/review-api';
import { useReviewSocket } from '@/hooks/useReviewSocket';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
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
  Layers,
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

  const handleCopyFix = () => {
    if (comment.suggestedFix) {
      navigator.clipboard.writeText(comment.suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
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
        {comment.resolved && (
          <span className="text-[11px] font-medium text-[#4ec9b0]">
            Resolved
          </span>
        )}
      </div>

      {/* Message */}
      <div className="flex items-start gap-2.5 my-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[#d4d4d4] leading-relaxed flex-1 font-sans">
          {comment.message}
        </p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 text-white">
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

      <div className="flex flex-col h-full max-h-[94vh] w-full max-w-7xl border border-[#333333] bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="border-b border-[#2d2d2d] bg-[#252526] px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="flex items-center gap-3">
            <PresenceIndicator users={activeUsers} currentUserId={userId} />

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
              <button
                onClick={onStartReview}
                className="h-8 px-3.5 rounded-lg border border-[#3a3a3a] hover:border-white bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#d4d4d4] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>AI Review Again</span>
              </button>
            ) : (
              <button
                onClick={onStartReview}
                className="h-8 px-4 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start AI Review</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#333333] hover:border-white text-[#858585] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="border-b border-[#2d2d2d] bg-[#252526] px-5 flex items-center gap-6">
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
            <span>Diagnostic Diff ({reviewComments.length})</span>
            {activeTab === 'diff' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#007acc]" />
            )}
          </button>
        </div>

        {/* Tab 1: Architecture View */}
        {activeTab === 'architecture' ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-[#1e1e1e]">
            <PrArchitectureViewer
              architecture={localArchitecture}
              isAnalyzing={isReviewing || isStreaming}
            />
          </div>
        ) : (
          /* Tab 2: Code Diff View (VS Code Dark+ Environment) */
          <div className="flex flex-1 overflow-hidden divide-x divide-[#2d2d2d]">
            {/* VS Code Explorer / File Sidebar */}
            <div className="w-72 bg-[#252526] flex flex-col overflow-y-auto divide-y divide-[#2d2d2d]">
              <div className="p-3 font-mono text-xs text-[#858585] flex items-center gap-2 uppercase tracking-wider text-[11px]">
                <Layers className="h-3.5 w-3.5 text-[#007acc]" />
                <span>Changed Files ({files.length})</span>
              </div>

              {isLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 bg-[#1e1e1e] animate-pulse rounded" />
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
                      className={`w-full flex items-center justify-between p-2.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                          : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-[#007acc]" />
                        <span className="truncate font-mono text-xs">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 font-mono text-[11px]">
                        {hasIssues && (
                          <span className="text-[#e3b341] bg-[#d4a017]/20 border border-[#d4a017]/40 px-1 rounded text-[10px]">
                            {fileComments.length}
                          </span>
                        )}
                        <span className="text-[#4ec9b0]">+{file.additions}</span>
                        <ChevronRight className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-[#858585]'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* VS Code Editor Diff Floor */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
              {selectedFile ? (
                <>
                  {/* File Header Tab */}
                  <div className="px-4 py-2 border-b border-[#2d2d2d] bg-[#252526] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2 text-[#cccccc]">
                      <span className="text-white font-medium">{selectedFile.filename}</span>
                      <span className="text-[#858585]">({selectedFile.status})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#4ec9b0]">+{selectedFile.additions}</span>
                      <span className="text-[#f85149]">-{selectedFile.deletions}</span>
                    </div>
                  </div>

                  {/* Code Diff Lines with VS Code Dark+ Syntax Highlighting */}
                  <div className="flex-1 overflow-auto font-mono text-[12px] leading-5 select-text bg-[#1e1e1e]">
                    {diffLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-[#858585] p-8">
                        <Check className="h-8 w-8 text-[#4ec9b0] mb-2" />
                        <span className="text-xs">Binary or empty file change</span>
                      </div>
                    ) : (
                      <div className="py-2">
                        {diffLines.map((line) => {
                          const inlineComments = commentsByLine[line.lineNum] ?? [];
                          const isAdd = line.type === 'add';
                          const isDelete = line.type === 'delete';
                          const isHunk = line.type === 'hunk';

                          return (
                            <React.Fragment key={line.id}>
                              <div
                                className={`flex items-start text-[12px] font-mono leading-5 ${
                                  isAdd
                                    ? 'bg-[#203426] border-l-[3px] border-[#2ea043]'
                                    : isDelete
                                    ? 'bg-[#372326] border-l-[3px] border-[#f85149]'
                                    : isHunk
                                    ? 'bg-[#252526] text-[#569cd6] border-l-[3px] border-[#007acc] py-0.5'
                                    : 'bg-[#1e1e1e] hover:bg-[#282828] border-l-[3px] border-transparent'
                                }`}
                              >
                                {/* Line Number Gutter */}
                                <div className="w-12 shrink-0 text-[#858585] select-none text-right pr-3 border-r border-[#2d2d2d] mr-3 text-[11px] font-mono">
                                  {isHunk ? '...' : isDelete ? '-' : line.lineNum || ''}
                                </div>

                                {/* Code Content with VS Code Syntax Highlighting */}
                                <div className="flex-1 whitespace-pre break-all pr-4 text-[#d4d4d4]">
                                  {isHunk ? (
                                    <span className="text-[#569cd6] font-medium">
                                      {line.content}
                                    </span>
                                  ) : (
                                    highlightVsCodeSyntax(
                                      isAdd
                                        ? line.content.replace(/^\+/, ' ')
                                        : isDelete
                                        ? line.content.replace(/^-/, ' ')
                                        : line.content
                                    )
                                  )}
                                </div>
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
                <div className="flex items-center justify-center h-full text-[#858585] text-xs font-mono">
                  Select a file from the explorer to inspect diff
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
