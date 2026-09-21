'use client';

import React, { useEffect, useState } from 'react';
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
import { FileReviewResult, reviewPullRequest } from '@/lib/review-api';
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

  // Diff Viewer Modal State
  const [inspectingPr, setInspectingPr] = useState<PullRequest | null>(null);
  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);

  // Milestone 3: AI Review state
  const [reviewResults, setReviewResults] = useState<FileReviewResult[] | undefined>(undefined);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user && !token) {
      router.push('/login');
    }
  }, [authLoading, user, token, router]);

  // Load repositories on mount
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoadingRepos(true);
    setError(null);

    fetchRepos(token)
      .then((data) => {
        if (!isMounted) return;
        setRepos(data);
        if (data.length > 0) setSelectedRepo(data[0]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load repositories');
      })
      .finally(() => {
        if (isMounted) setLoadingRepos(false);
      });

    return () => { isMounted = false; };
  }, [token]);

  // Load pull requests when selectedRepo changes
  useEffect(() => {
    if (!token || !selectedRepo) return;
    let isMounted = true;
    setLoadingPrs(true);

    fetchPullRequests(token, selectedRepo.owner.login, selectedRepo.name)
      .then((prs) => { if (isMounted) setPullRequests(prs); })
      .catch(() => { if (isMounted) setPullRequests([]); })
      .finally(() => { if (isMounted) setLoadingPrs(false); });

    return () => { isMounted = false; };
  }, [token, selectedRepo]);

  // Inspect raw diff
  const handleInspectDiff = async (pr: PullRequest) => {
    if (!token || !selectedRepo) return;
    setInspectingPr(pr);
    setLoadingDiff(true);
    setReviewResults(undefined);

    try {
      const response = await fetchPullRequestDiff(
        token,
        selectedRepo.owner.login,
        selectedRepo.name,
        pr.number
      );
      setDiffFiles(response.files);
    } catch (err) {
      console.error('Failed to load diff files:', err);
      setDiffFiles([]);
    } finally {
      setLoadingDiff(false);
    }
  };

  // Milestone 3: Trigger AI review
  const handleStartReview = async () => {
    if (!token || !selectedRepo || !inspectingPr) return;
    setIsReviewing(true);
    setReviewResults(undefined);

    try {
      const result = await reviewPullRequest(
        token,
        selectedRepo.owner.login,
        selectedRepo.name,
        inspectingPr.number
      );
      setReviewResults(result.results);
    } catch (err) {
      console.error('AI Review failed:', err);
    } finally {
      setIsReviewing(false);
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

      {/* Diff + AI Review Modal */}
      {inspectingPr && (
        <DiffViewer
          pr={inspectingPr}
          files={diffFiles}
          isLoading={loadingDiff}
          reviewResults={reviewResults}
          isReviewing={isReviewing}
          onClose={() => {
            setInspectingPr(null);
            setReviewResults(undefined);
          }}
          onStartReview={handleStartReview}
        />
      )}
    </div>
  );
}
