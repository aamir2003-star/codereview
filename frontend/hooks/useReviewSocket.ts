'use client';

import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { fetchReview, PersistedComment, PrArchitectureSummary } from '@/lib/review-api';

export interface PresenceUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export interface ReviewProgress {
  filesReviewed: number;
  totalFiles: number;
  percent?: number;
  stage?: string;
  currentFile?: string;
}

interface UseReviewSocketProps {
  reviewId: string | null;
  token: string | null;
  onNewComment?: (comment: PersistedComment) => void;
  onCommentResolved?: (data: { commentId: string; resolved: boolean; resolvedBy: string }) => void;
  onCommentUpvoted?: (data: { commentId: string; upvotes: string[] }) => void;
  onReviewComplete?: (data: { totalComments: number }) => void;
  onReviewError?: (data: { reviewId: string; message: string; isHighDemand?: boolean }) => void;
  onArchitectureSummary?: (data: { reviewId: string; architecture: PrArchitectureSummary }) => void;
}

export function useReviewSocket({
  reviewId,
  token,
  onNewComment,
  onCommentResolved,
  onCommentUpvoted,
  onReviewComplete,
  onReviewError,
  onArchitectureSummary,
}: UseReviewSocketProps) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Keep callback references stable to prevent re-triggering socket subscriptions on every render
  const callbacksRef = useRef({
    onNewComment,
    onCommentResolved,
    onCommentUpvoted,
    onReviewComplete,
    onReviewError,
    onArchitectureSummary,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewComment,
      onCommentResolved,
      onCommentUpvoted,
      onReviewComplete,
      onReviewError,
      onArchitectureSummary,
    };
  });

  useEffect(() => {
    if (!reviewId) {
      setActiveUsers([]);
      setProgress(null);
      setIsStreaming(false);
      return;
    }

    const socket = getSocket(token);

    const joinRoom = () => {
      socket.emit('join:review', { reviewId });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on('connect', joinRoom);
    let connectErrorCount = 0;
    socket.on('connect_error', (err) => {
      connectErrorCount++;
      // Only log every 5th error to avoid console spam during reconnection attempts
      if (connectErrorCount <= 2 || connectErrorCount % 5 === 0) {
        console.warn(`[Socket.io] Review stream connection issue (attempt ${connectErrorCount}):`, err.message);
      }
    });

    // Handle incoming new comment stream
    const handleNewComment = (data: { reviewId: string; comment: PersistedComment }) => {
      if (data.reviewId === reviewId) {
        callbacksRef.current.onNewComment?.(data.comment);
      }
    };

    // Handle comment resolved live sync
    const handleResolved = (data: { reviewId: string; commentId: string; resolved: boolean; resolvedBy: string }) => {
      if (data.reviewId === reviewId) {
        callbacksRef.current.onCommentResolved?.(data);
      }
    };

    // Handle comment upvoted live sync
    const handleUpvoted = (data: { reviewId: string; commentId: string; upvotes: string[] }) => {
      if (data.reviewId === reviewId) {
        callbacksRef.current.onCommentUpvoted?.(data);
      }
    };

    // Handle architecture summary live stream
    const handleArchitecture = (data: { reviewId: string; architecture: PrArchitectureSummary }) => {
      if (data.reviewId === reviewId) {
        callbacksRef.current.onArchitectureSummary?.(data);
      }
    };

    // Handle review progress
    const handleProgress = (data: {
      reviewId: string;
      filesReviewed: number;
      totalFiles: number;
      percent?: number;
      stage?: string;
      currentFile?: string;
    }) => {
      if (data.reviewId === reviewId) {
        setIsStreaming(true);
        setProgress({
          filesReviewed: data.filesReviewed,
          totalFiles: data.totalFiles,
          percent: data.percent,
          stage: data.stage,
          currentFile: data.currentFile,
        });
      }
    };

    // Handle review complete
    const handleComplete = (data: { reviewId: string; totalComments: number }) => {
      if (data.reviewId === reviewId) {
        setIsStreaming(false);
        callbacksRef.current.onReviewComplete?.(data);
      }
    };

    // Handle review error (e.g. high traffic or model errors)
    const handleError = (data: { reviewId: string; message: string; isHighDemand?: boolean }) => {
      if (data.reviewId === reviewId) {
        setIsStreaming(false);
        callbacksRef.current.onReviewError?.(data);
      }
    };

    // Handle presence updates
    const handlePresence = (data: { reviewId: string; users: PresenceUser[] }) => {
      if (data.reviewId === reviewId) {
        setActiveUsers(data.users);
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:resolved', handleResolved);
    socket.on('comment:upvoted', handleUpvoted);
    socket.on('review:architecture', handleArchitecture);
    socket.on('review:progress', handleProgress);
    socket.on('review:complete', handleComplete);
    socket.on('review:error', handleError);
    socket.on('presence:update', handlePresence);

    // Resilient background polling safety net to guarantee no UI freeze
    let isMounted = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const pollSync = async () => {
      try {
        const { review, comments } = await fetchReview(token, reviewId);
        if (!isMounted) return;

        if (comments && comments.length > 0) {
          comments.forEach((c) => callbacksRef.current.onNewComment?.(c));
        }

        if (review.architectureSummary) {
          callbacksRef.current.onArchitectureSummary?.({
            reviewId: review._id,
            architecture: review.architectureSummary,
          });
        }

        if (review.status === 'done') {
          setIsStreaming(false);
          setProgress({
            filesReviewed: review.filesReviewed,
            totalFiles: review.totalFiles,
            percent: 100,
            stage: 'Audit complete',
          });
          callbacksRef.current.onReviewComplete?.({ totalComments: review.totalComments });
          if (pollTimer) clearInterval(pollTimer);
        } else if (review.status === 'error') {
          setIsStreaming(false);
          callbacksRef.current.onReviewError?.({
            reviewId: review._id,
            message: review.errorMessage || 'Review encountered an error',
            isHighDemand: true,
          });
          if (pollTimer) clearInterval(pollTimer);
        } else if (review.status === 'streaming') {
          setIsStreaming(true);
          const percent = Math.min(
            98,
            Math.max(15, Math.floor((review.filesReviewed / (review.totalFiles || 1)) * 95))
          );
          setProgress((prev) => ({
            filesReviewed: review.filesReviewed,
            totalFiles: review.totalFiles,
            percent: Math.max(prev?.percent ?? 15, percent),
            stage: prev?.stage || `Reviewing files (${review.filesReviewed}/${review.totalFiles})...`,
            currentFile: prev?.currentFile,
          }));
        } else if (review.status === 'pending') {
          setIsStreaming(true);
          setProgress((prev) => prev ?? {
            filesReviewed: 0,
            totalFiles: 0,
            percent: 5,
            stage: 'Initializing review...',
          });
        }
      } catch {
        // Quiet non-fatal poll error
      }
    };

    // Run first poll immediately so progress appears even if socket hasn't connected yet
    pollSync();
    pollTimer = setInterval(pollSync, 2500);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      socket.off('connect', joinRoom);
      socket.emit('leave:review', { reviewId });
      socket.off('comment:new', handleNewComment);
      socket.off('comment:resolved', handleResolved);
      socket.off('comment:upvoted', handleUpvoted);
      socket.off('review:architecture', handleArchitecture);
      socket.off('review:progress', handleProgress);
      socket.off('review:complete', handleComplete);
      socket.off('review:error', handleError);
      socket.off('presence:update', handlePresence);
    };
  }, [reviewId, token]); // Stable: only re-subscribes when reviewId or token actually changes!

  return {
    activeUsers,
    progress,
    isStreaming,
  };
}
