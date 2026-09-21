'use client';

import { useEffect, useState } from 'react';
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
  currentFile?: string;
}

interface UseReviewSocketProps {
  reviewId: string | null;
  token: string | null;
  onNewComment?: (comment: PersistedComment) => void;
  onCommentResolved?: (data: { commentId: string; resolved: boolean; resolvedBy: string }) => void;
  onCommentUpvoted?: (data: { commentId: string; upvotes: string[] }) => void;
  onReviewComplete?: (data: { totalComments: number }) => void;
}

export function useReviewSocket({
  reviewId,
  token,
  onNewComment,
  onCommentResolved,
  onCommentUpvoted,
  onReviewComplete,
}: UseReviewSocketProps) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    if (!reviewId || !token) return;

    const socket = getSocket(token);

    // Join the review room
    socket.emit('join:review', { reviewId });

    // Handle incoming new comment stream
    const handleNewComment = (data: { reviewId: string; comment: PersistedComment }) => {
      if (data.reviewId === reviewId) {
        onNewComment?.(data.comment);
      }
    };

    // Handle comment resolved live sync
    const handleResolved = (data: { reviewId: string; commentId: string; resolved: boolean; resolvedBy: string }) => {
      if (data.reviewId === reviewId) {
        onCommentResolved?.(data);
      }
    };

    // Handle comment upvoted live sync
    const handleUpvoted = (data: { reviewId: string; commentId: string; upvotes: string[] }) => {
      if (data.reviewId === reviewId) {
        onCommentUpvoted?.(data);
      }
    };

    // Handle review progress
    const handleProgress = (data: { reviewId: string; filesReviewed: number; totalFiles: number; currentFile?: string }) => {
      if (data.reviewId === reviewId) {
        setIsStreaming(true);
        setProgress({
          filesReviewed: data.filesReviewed,
          totalFiles: data.totalFiles,
          currentFile: data.currentFile,
        });
      }
    };

    // Handle review complete
    const handleComplete = (data: { reviewId: string; totalComments: number }) => {
      if (data.reviewId === reviewId) {
        setIsStreaming(false);
        onReviewComplete?.(data);
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
    socket.on('presence:update', handlePresence);

    return () => {
      socket.emit('leave:review', { reviewId });
      socket.off('comment:new', handleNewComment);
      socket.off('comment:resolved', handleResolved);
      socket.off('comment:upvoted', handleUpvoted);
      socket.off('review:progress', handleProgress);
      socket.off('review:complete', handleComplete);
      socket.off('presence:update', handlePresence);
    };
  }, [
    reviewId,
    token,
    onNewComment,
    onCommentResolved,
    onCommentUpvoted,
    onReviewComplete,
  ]);

  return {
    activeUsers,
    progress,
    isStreaming,
  };
}
