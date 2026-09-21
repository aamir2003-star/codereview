'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
} from '@/lib/review-api';
import { Loader2, AlertCircle } from 'lucide-react';

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
  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  // Persisted Review State
  const [currentReview, setCurrentReview] = useState<PersistedReview | undefined>(undefined);
  const [reviewComments, setReviewComments] = useState<PersistedComment[]>([]);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

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
      if (!token) return;
      try {
        const { review, comments } = await fetchReview(token, id);
        setCurrentReview(review);
        setReviewComments(comments);

        if (review.status === 'done' || review.status === 'error') {
          setIsReviewing(false);
        } else {
          // Poll every 3 seconds until done
          setTimeout(() => pollReview(id), 3000);
        }
      } catch (err) {
        console.error('Poll review error:', err);
        setIsReviewing(false);
      }
    },
    [token]
  );

  // Open diff modal and check for existing review
  const handleInspectDiff = async (pr: PullRequest) => {
    if (!token || !selectedRepo) return;
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <p>{error}</p>
          </div>
        )}
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
          <div className="md:col-span-7 lg:col-span-8">
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
            setInspectingPr(null);
            setCurrentReview(undefined);
            setReviewComments([]);
            setReviewId(null);
          }}
          onStartReview={handleStartReview}
          onResolve={handleResolve}
          onUpvote={handleUpvote}
          userId={user?._id}
          onCommentsUpdated={setReviewComments}
        />
      )}
    </div>
  );
}
