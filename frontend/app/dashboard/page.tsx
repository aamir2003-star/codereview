'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { RepoList } from '@/components/dashboard/RepoList';
import { PrList } from '@/components/dashboard/PrList';
import { DiffViewer } from '@/components/diff/DiffViewer';
import {
  Repository,
  PullRequest,
  FileDiff,
  fetchRepos,
  fetchPullRequests,
  fetchPullRequestDiff,
} from '@/lib/api';
import {
  PersistedComment,
  PersistedReview,
  triggerReview,
  fetchReview,
  fetchReviewByPr,
  resolveComment,
  upvoteComment,
  stopReview,
} from '@/lib/review-api';
import { LivingCyberCanvas } from '@/components/dashboard/LivingCyberCanvas';
import { LuxuryPreloader } from '@/components/ui/LuxuryPreloader';
import { AlertCircle, Maximize2, Square, X, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [loadingPrs, setLoadingPrs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Diff Modal State
  const [inspectingPr, setInspectingPr] = useState<PullRequest | null>(null);
  const [minimizedPr, setMinimizedPr] = useState<PullRequest | null>(null);
  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  // Persisted Review State
  const [currentReview, setCurrentReview] = useState<PersistedReview | undefined>(undefined);
  const [reviewComments, setReviewComments] = useState<PersistedComment[]>([]);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  // Lightweight background sync when a review is running minimized
  useEffect(() => {
    if (!minimizedPr || !isReviewing || !reviewId || !token) return;

    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const { review, comments } = await fetchReview(token, reviewId);
        if (!mounted) return;
        if (comments && comments.length > 0) {
          setReviewComments(comments);
        }
        if (review) {
          setCurrentReview(review);
          if (review.status === 'done' || review.status === 'error') {
            setIsReviewing(false);
          }
        }
      } catch {
        // Quiet poll error
      }
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [minimizedPr, isReviewing, reviewId, token]);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user && !token) {
      router.push('/login');
    }
  }, [authLoading, user, token, router]);

  // Load repositories
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoadingRepos(true);
    fetchRepos(token)
      .then((data) => {
        if (!mounted) return;
        setRepos(data);
        // Only auto-select first repo on desktop (>= 768px). On mobile, start on the repos list.
        if (data.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedRepo(data[0]);
        }
      })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoadingRepos(false); });
    return () => { mounted = false; };
  }, [token]);

  // Load pull requests when selectedRepo changes
  useEffect(() => {
    if (!token || !selectedRepo) return;
    let mounted = true;
    setLoadingPrs(true);
    fetchPullRequests(token, selectedRepo.owner.login, selectedRepo.name)
      .then((prs) => { if (mounted) setPullRequests(prs); })
      .catch(() => { if (mounted) setPullRequests([]); })
      .finally(() => { if (mounted) setLoadingPrs(false); });
    return () => { mounted = false; };
  }, [token, selectedRepo]);

  const handleReviewComplete = useCallback(({ totalComments }: { totalComments: number }) => {
    stopPolling();
    setIsReviewing(false);
    setCurrentReview((prev) => (prev ? { ...prev, status: 'done', totalComments } : prev));
  }, [stopPolling]);

  const handleReviewError = useCallback(({ message }: { message: string }) => {
    stopPolling();
    setIsReviewing(false);
    setCurrentReview((prev) => (prev ? { ...prev, status: 'error', errorMessage: message } : prev));
  }, [stopPolling]);

  // Open diff modal and check for existing review
  const handleInspectDiff = async (pr: PullRequest) => {
    if (!token || !selectedRepo) return;

    // If opening the currently minimized background review, restore it smoothly!
    if (minimizedPr && minimizedPr.number === pr.number) {
      setInspectingPr(minimizedPr);
      setMinimizedPr(null);
      return;
    }

    stopPolling();
    setMinimizedPr(null);
    setInspectingPr(pr);
    setLoadingDiff(true);
    setCurrentReview(undefined);
    setReviewComments([]);
    setReviewId(null);

    // Fetch diff files and check for existing review in parallel
    const [diffResult] = await Promise.allSettled([
      fetchPullRequestDiff(token, selectedRepo.owner.login, selectedRepo.name, pr.number),
      fetchReviewByPr(token, selectedRepo.owner.login, selectedRepo.name, pr.number)
        .then(({ review, comments }) => {
          setCurrentReview(review);
          setReviewComments(comments);
          setReviewId(review._id);
          if (review.status === 'streaming' || review.status === 'pending') {
            setIsReviewing(true);
          }
        })
        .catch(() => { /* No existing review — that's fine */ }),
    ]);

    if (diffResult.status === 'fulfilled') {
      setDiffFiles(diffResult.value.files);
    }
    setLoadingDiff(false);
  };

  // Trigger a new AI review
  const handleStartReview = async () => {
    if (!token || !selectedRepo || !inspectingPr) return;
    stopPolling();
    setIsReviewing(true);
    setCurrentReview(undefined);
    setReviewComments([]);

    try {
      const { reviewId: newId } = await triggerReview(token, {
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        pullNumber: inspectingPr.number,
        prUrl: inspectingPr.html_url,
        prTitle: inspectingPr.title,
      });
      setReviewId(newId);
    } catch (err) {
      console.error('Start review error:', err);
      setIsReviewing(false);
    }
  };

  // Stop an ongoing AI review
  const handleStopReview = async () => {
    if (!token || !reviewId) return;
    try {
      await stopReview(token, reviewId);
    } catch (err) {
      console.error('Stop review error:', err);
    } finally {
      stopPolling();
      setIsReviewing(false);
      setMinimizedPr(null);
    }
  };

  // Optimistic resolve toggle
  const handleResolve = async (commentId: string) => {
    if (!token) return;
    // Optimistic update
    setReviewComments((prev) =>
      prev.map((c) => (c._id === commentId ? { ...c, resolved: !c.resolved } : c))
    );
    try {
      const { comment } = await resolveComment(token, commentId);
      setReviewComments((prev) =>
        prev.map((c) => (c._id === commentId ? comment : c))
      );
    } catch {
      // Revert on failure
      setReviewComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, resolved: !c.resolved } : c))
      );
    }
  };

  // Optimistic upvote toggle
  const handleUpvote = async (commentId: string) => {
    if (!token || !user) return;
    setReviewComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const hasUpvoted = c.upvotes.includes(user._id);
        return {
          ...c,
          upvotes: hasUpvoted
            ? c.upvotes.filter((id) => id !== user._id)
            : [...c.upvotes, user._id],
        };
      })
    );
    try {
      const { comment } = await upvoteComment(token, commentId);
      setReviewComments((prev) => prev.map((c) => (c._id === commentId ? comment : c)));
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  // Real-time socket comment event handlers
  const handleNewComment = useCallback((newComment: PersistedComment) => {
    setReviewComments((prev) => {
      if (prev.some((c) => c._id === newComment._id)) return prev;
      return [...prev, newComment];
    });
  }, []);

  const handleCommentResolved = useCallback(({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
    setReviewComments((prev) =>
      prev.map((c) => (c._id === commentId ? { ...c, resolved } : c))
    );
  }, []);

  const handleCommentUpvoted = useCallback(({ commentId, upvotes }: { commentId: string; upvotes: string[] }) => {
    setReviewComments((prev) =>
      prev.map((c) => (c._id === commentId ? { ...c, upvotes } : c))
    );
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <LuxuryPreloader stage="AUTHENTICATING REPOSITORY ACCESS" size="fullscreen" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black text-white overflow-hidden">
      {/* Living 3D Cyber Background */}
      <LivingCyberCanvas />

      <Navbar />
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-none border border-[#3a3a3a] bg-[#141414] p-4 text-xs text-[#cccccc] font-serif">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#d4a017]" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Profile Header ── */}
        <div className="border border-[#262626] bg-[#0d0d0d] p-5 sm:p-6 rounded-xl mb-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Avatar + Identity */}
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-11 w-11 rounded-full border border-[#3a3a3a]"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-[#141414] border border-[#3a3a3a] flex items-center justify-center font-mono text-sm text-white">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {/* Status Dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-black" />
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    @{user?.username}
                  </h1>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                    Active Session
                  </span>
                </div>
                <p className="text-xs text-[#a1a1aa] font-mono">
                  GitHub OAuth &bull; {repos.length} repositories synchronized
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className={`md:col-span-5 lg:col-span-4 ${selectedRepo ? 'hidden md:block' : 'block'}`}>
            <RepoList
              repos={repos}
              selectedRepo={selectedRepo}
              onSelectRepo={(repo) => {
                setSelectedRepo(repo);
                setPullRequests([]);
              }}
              isLoading={loadingRepos}
            />
          </div>
          <div className={`md:col-span-7 lg:col-span-8 space-y-6 ${selectedRepo ? 'block' : 'hidden md:block'}`}>
            <PrList
              repo={selectedRepo}
              pullRequests={pullRequests}
              isLoading={loadingPrs}
              onInspectDiff={handleInspectDiff}
              onStartReview={handleInspectDiff}
              onBack={() => setSelectedRepo(null)}
            />
          </div>
        </div>
      </main>

      {inspectingPr && (
        <DiffViewer
          pr={inspectingPr}
          files={diffFiles}
          isLoading={loadingDiff}
          reviewId={reviewId}
          currentReview={currentReview}
          reviewComments={reviewComments}
          isReviewing={isReviewing}
          token={token}
          onClose={async () => {
            // Stop review process on backend if actively running
            if (isReviewing && reviewId && token) {
              try {
                await stopReview(token, reviewId);
              } catch (err) {
                console.warn('Failed to stop review on close:', err);
              }
            }
            stopPolling();
            setIsReviewing(false);
            setInspectingPr(null);
            setMinimizedPr(null);
            setCurrentReview(undefined);
            setReviewComments([]);
            setReviewId(null);
          }}
          onMinimize={() => {
            setMinimizedPr(inspectingPr);
            setInspectingPr(null);
          }}
          onStartReview={handleStartReview}
          onStopReview={handleStopReview}
          onResolve={handleResolve}
          onUpvote={handleUpvote}
          userId={user?._id}
          onNewComment={handleNewComment}
          onCommentResolved={handleCommentResolved}
          onCommentUpvoted={handleCommentUpvoted}
          onReviewComplete={handleReviewComplete}
          onReviewError={handleReviewError}
        />
      )}

      {/* Background Review Floating Status Widget */}
      {minimizedPr && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-3.5 px-4 py-3 rounded-xl border border-emerald-500/40 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl shadow-black text-white max-w-sm sm:max-w-md animate-in slide-in-from-bottom-5">
          <div className="relative flex h-3 w-3 shrink-0">
            {isReviewing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </>
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 -ml-0.5 -mt-0.5" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-white truncate">
                PR #{minimizedPr.number}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  isReviewing
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                    : 'text-[#4ec9b0] bg-emerald-950/40 border-emerald-500/20'
                }`}
              >
                {isReviewing ? 'ANALYZING IN BACKGROUND' : 'AUDIT COMPLETE'}
              </span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] truncate font-mono">
              {minimizedPr.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#262626]">
            <button
              onClick={() => {
                setInspectingPr(minimizedPr);
                setMinimizedPr(null);
              }}
              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Open Diff & Findings"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="text-[11px]">Open</span>
            </button>

            {isReviewing ? (
              <button
                onClick={handleStopReview}
                className="h-7 w-7 rounded-lg border border-[#f85149]/40 bg-[#372326] text-[#ff7b72] hover:bg-[#48282c] flex items-center justify-center transition-all cursor-pointer"
                title="Stop review on backend"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => setMinimizedPr(null)}
                className="h-7 w-7 rounded-lg hover:bg-[#252526] text-[#858585] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
