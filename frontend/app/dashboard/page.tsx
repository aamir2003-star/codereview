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
import { ReviewSummaryCard } from '@/components/dashboard/ReviewSummaryCard';
import { LivingCyberCanvas } from '@/components/dashboard/LivingCyberCanvas';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, LogOut, GitFork, Sparkles, Shield, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [loadingPrs, setLoadingPrs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Diff Modal State
  const [inspectingPr, setInspectingPr] = useState<PullRequest | null>(null);
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
        if (data.length > 0) setSelectedRepo(data[0]);
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

  // Poll review status while review is in progress
  const pollReview = useCallback(
    async (id: string) => {
      if (!token || !isPollingRef.current) return;
      try {
        const { review, comments } = await fetchReview(token, id);
        if (!isPollingRef.current) return;
        setCurrentReview(review);
        setReviewComments(comments);

        if (review.status === 'done' || review.status === 'error') {
          stopPolling();
          setIsReviewing(false);
        } else {
          pollTimerRef.current = setTimeout(() => pollReview(id), 3000);
        }
      } catch (err) {
        console.error('Poll review error:', err);
        stopPolling();
        setIsReviewing(false);
      }
    },
    [token, stopPolling]
  );

  // Open diff modal and check for existing review
  const handleInspectDiff = async (pr: PullRequest) => {
    if (!token || !selectedRepo) return;
    stopPolling();
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
          // If it's still running, start polling
          if (review.status === 'streaming' || review.status === 'pending') {
            isPollingRef.current = true;
            setIsReviewing(true);
            pollReview(review._id);
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
    isPollingRef.current = true;
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
      pollReview(newId);
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Living 3D Cyber Background */}
      <LivingCyberCanvas />

      <Navbar />
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 backdrop-blur-md">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Cinematic Profile Header ── */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur-2xl shadow-[0_0_60px_rgba(52,211,153,0.06)]">
          {/* Top accent scan-line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

          {/* Corner glow orbs */}
          <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 px-5 py-4 sm:px-7">
            {/* Avatar + Identity */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {/* Glow ring behind avatar */}
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md scale-125" />
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="relative h-12 w-12 rounded-full ring-2 ring-emerald-500/50 border border-neutral-700 shadow-lg"
                  />
                ) : (
                  <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-base text-emerald-300 shadow-inner">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {/* Online pulse dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                    @{user?.username}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                    <Sparkles className="h-2.5 w-2.5" /> Active Session
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  GitHub OAuth &bull;{' '}
                  <span className="text-emerald-400 font-semibold">{repos.length}</span> repos synced
                </p>
              </div>
            </div>

            {/* Right side: status badges + logout */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Shield status badge */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-300 leading-none">Protected</p>
                  <p className="text-[9px] text-neutral-500 font-mono leading-none mt-0.5">AI Scan Ready</p>
                </div>
              </div>

              {/* Terminal badge */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] font-bold text-cyan-300 leading-none">Gemini Flash</p>
                  <p className="text-[9px] text-neutral-500 font-mono leading-none mt-0.5">Neural Engine</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-neutral-800 hover:border-rose-500/30 transition-all rounded-xl"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </Button>
            </div>
          </div>

          {/* Bottom accent scan-line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-700/40 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-5 lg:col-span-4">
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
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            {selectedRepo && (
              <ReviewSummaryCard
                repoName={selectedRepo.full_name}
                totalPRs={pullRequests.length}
                unresolvedCount={reviewComments.filter((c) => !c.resolved).length}
                notice="AI review engine is active. Select any pull request to inspect diff and stream review comments."
              />
            )}
            <PrList
              repo={selectedRepo}
              pullRequests={pullRequests}
              isLoading={loadingPrs}
              onInspectDiff={handleInspectDiff}
              onStartReview={handleInspectDiff}
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
          onClose={() => {
            stopPolling();
            setIsReviewing(false);
            setInspectingPr(null);
            setCurrentReview(undefined);
            setReviewComments([]);
            setReviewId(null);
          }}
          onStartReview={handleStartReview}
          onStopReview={handleStopReview}
          onResolve={handleResolve}
          onUpvote={handleUpvote}
          userId={user?._id}
          onNewComment={handleNewComment}
          onCommentResolved={handleCommentResolved}
          onCommentUpvoted={handleCommentUpvoted}
        />
      )}
    </div>
  );
}
