'use client';

import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { PersistedComment } from '@/lib/review-api';

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
}

export function useReviewSocket({
  reviewId,
  token,
  onNewComment,
  onCommentResolved,
  onCommentUpvoted,
  onReviewComplete,
  onReviewError,
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
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewComment,
      onCommentResolved,
      onCommentUpvoted,
      onReviewComplete,
      onReviewError,
    };
  });

  useEffect(() => {
    if (!reviewId || !token) {
      setActiveUsers([]);
      setProgress(null);
      setIsStreaming(false);
      return;
    }

    const socket = getSocket(token);

    // Join the review room
    socket.emit('join:review', { reviewId });

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
    socket.on('review:progress', handleProgress);
    socket.on('review:complete', handleComplete);
    socket.on('review:error', handleError);
    socket.on('presence:update', handlePresence);

    return () => {
      socket.emit('leave:review', { reviewId });
      socket.off('comment:new', handleNewComment);
      socket.off('comment:resolved', handleResolved);
      socket.off('comment:upvoted', handleUpvoted);
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
