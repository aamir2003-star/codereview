import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Comment } from '../models/Comment';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DeveloperMetrics {
  userId: string;
  username: string;
  reviewsAuthored: number;
  avgBugsPerReview: number;
  resolvedRate: number;
  riskScore: number;
}

export interface PrHealthReport {
  pullNumber: number;
  repoName: string;
  overallScore: number;       // 0 – 100
  bugDensity: number;
  securityIssues: number;
  codeSmells: number;
  nits: number;
  criticalPaths: string[];
  recommendation: 'approve' | 'request_changes' | 'needs_discussion';
}

export interface TrendDataPoint {
  date: string;          // ISO date YYYY-MM-DD
  reviewCount: number;
  avgScore: number;
  bugCount: number;
}

export interface AnalyticsSummary {
  totalReviews: number;
  totalComments: number;
  avgHealthScore: number;
  topContributors: DeveloperMetrics[];
  weeklyTrend: TrendDataPoint[];
}

// ─── Severity weight map ────────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<string, number> = {
  bug: 10,
  security: 25,
  smell: 3,
  nit: 1,
};

// ─── Helper utilities ───────────────────────────────────────────────────────────

function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, raw));
}

/**
 * Computes the weighted penalty for a set of comments.
 * Higher penalties lower the health score of the PR.
 */
function computePenalty(comments: Array<{ severity: string }>): number {
  let penalty = 0;
  for (let i = 0; i < comments.length; i++) {
    const weight = SEVERITY_WEIGHTS[comments[i]?.severity] ?? 0;
    penalty += weight;
  }
  return penalty;
}

/**
 * Normalise a repo-relative file path for consistent key usage.
 */
function normalisePath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace('../', '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

/**
 * Groups an array of objects by a key extractor.
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

// ─── Main analytics service ─────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Generate a health report for a single pull request review.
   */
  async generatePrHealthReport(reviewId: string): Promise<PrHealthReport> {
    const review = await Review.findById(reviewId);
    if (!review) throw new Error(`Review ${reviewId} not found`);

    const comments = await Comment.find({ reviewId: review._id });
    const grouped = groupBy(comments, (c) => c.severity);

    const bugCount = (grouped['bug'] || []).length;
    const securityCount = (grouped['security'] || []).length;
    const smellCount = (grouped['smell'] || []).length;
    const nitCount = (grouped['nit'] || []).length;

    const totalFilesChanged = review.totalFiles || 0;
    const bugDensity = bugCount / totalFilesChanged;

    const penalty = computePenalty(comments);
    const overallScore = clampScore(100 - penalty);

    // Determine critical paths – files with >= 2 bug/security comments
    const fileComments = groupBy(comments, (c) => normalisePath(c.filePath));
    const criticalPaths: string[] = [];
    for (const [path, fileGroup] of Object.entries(fileComments)) {
      const criticalCount = fileGroup.filter(
        (c) => c.severity === 'bug' || c.severity === 'security'
      ).length;
      if (criticalCount >= 2) criticalPaths.push(path);
    }

    let recommendation: PrHealthReport['recommendation'] = 'approve';
    if (securityCount > 0 || bugCount >= 3) {
      recommendation = 'request_changes';
    } else if (bugCount > 0 || smellCount >= 5) {
      recommendation = 'needs_discussion';
    }

    return {
      pullNumber: review.pullNumber,
      repoName: `${review.owner}/${review.repo}`,
      overallScore,
      bugDensity: Math.round(bugDensity * 100) / 100,
      securityIssues: securityCount,
      codeSmells: smellCount,
      nits: nitCount,
      criticalPaths,
      recommendation,
    };
  },

  /**
   * Compute developer-level metrics for the top contributors of a repo.
   */
  async getDeveloperMetrics(
    owner: string,
    repo: string,
    limit = 10
  ): Promise<DeveloperMetrics[]> {
    const reviews = await Review.find({ owner, repo }).populate('requestedBy', 'username email').lean();
    if (!reviews.length) return [];

    const byUser = groupBy(reviews, (r: any) => r.requestedBy?._id?.toString() || r.requestedBy?.toString() || 'unknown');
    const metrics: DeveloperMetrics[] = [];

    Object.entries(byUser).forEach(async ([userId, userReviews]) => {
      const reviewIds = userReviews.map((r: any) => r._id);
      const allComments = await Comment.find({ reviewId: { $in: reviewIds } }).lean();

      const bugComments = allComments.filter((c: any) => c.severity === 'bug');
      const resolvedComments = allComments.filter((c: any) => c.resolved === true);

      const avgBugs = allComments.length > 0
        ? bugComments.length / userReviews.length
        : 0;

      const resolvedRate = allComments.length > 0
        ? resolvedComments.length / allComments.length
        : 1;

      // Risk score: higher means more bugs, lower resolution rate
      const riskScore = clampScore(
        Math.round((avgBugs * 15) + ((1 - resolvedRate) * 50))
      );

      const userDoc = (userReviews[0] as any).requestedBy;
      const username = userDoc?.username || (userId !== 'unknown' ? `Developer (${userId.slice(-4)})` : 'Collaborator');

      metrics.push({
        userId,
        username,
        reviewsAuthored: userReviews.length,
        avgBugsPerReview: Math.round(avgBugs * 100) / 100,
        resolvedRate: Math.round(resolvedRate * 100) / 100,
        riskScore,
      });
    });

    metrics.sort((a, b) => b.reviewsAuthored - a.reviewsAuthored);
    return metrics.slice(0, limit);
  },

  /**
   * Build a weekly trend for the past N weeks of review activity.
   */
  async getWeeklyTrend(
    owner: string,
    repo: string,
    weeks = 8
  ): Promise<TrendDataPoint[]> {
    const trend: TrendDataPoint[] = [];
    const baseNow = new Date();

    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = new Date(baseNow.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekReviews = await Review.find({
        owner,
        repo,
        createdAt: { $gte: weekStart, $lt: weekEnd },
      }).lean();

      const reviewIds = weekReviews.map((r: any) => r._id);
      const weekComments = await Comment.find({
        reviewId: { $in: reviewIds },
      }).lean();

      const bugCount = weekComments.filter((c: any) => c.severity === 'bug').length;

      let avgScore = 100;
      if (weekReviews.length > 0) {
        const scores = weekReviews.map((r: any) => {
          const rComments = weekComments.filter(
            (c: any) => c.reviewId.toString() === r._id.toString()
          );
          return clampScore(100 - computePenalty(rComments));
        });
        avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      trend.push({
        date: weekStart.toISOString().split('T')[0],
        reviewCount: weekReviews.length,
        avgScore: Math.round(avgScore),
        bugCount,
      });
    }

    return trend;
  },

  /**
   * Full analytics summary combining all data for a repository dashboard.
   */
  async getAnalyticsSummary(owner: string, repo: string): Promise<AnalyticsSummary> {
    const repoReviews = await Review.find({ owner, repo }).select('_id').lean();
    const repoReviewIds = repoReviews.map((r: any) => r._id);

    const [totalReviews, totalComments] = await Promise.all([
      Review.countDocuments({ owner, repo }),
      Comment.countDocuments({ reviewId: { $in: repoReviewIds } }),
    ]);

    const topContributors = await this.getDeveloperMetrics(owner, repo, 5);
    const weeklyTrend = await this.getWeeklyTrend(owner, repo);

    // Compute a global average health score from the latest 50 reviews for this repo
    const recentReviews = await Review.find({ owner, repo })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let avgHealthScore = 100;
    if (recentReviews.length) {
      const recentIds = recentReviews.map((r: any) => r._id);
      const recentComments = await Comment.find({
        reviewId: { $in: recentIds },
      }).lean();

      const healthScores = recentReviews.map((r: any) => {
        const rComments = recentComments.filter(
          (c: any) => String(c.reviewId) === String(r._id)
        );
        return clampScore(100 - computePenalty(rComments));
      });

      avgHealthScore =
        healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
    }

    return {
      totalReviews,
      totalComments,
      avgHealthScore: Math.round(avgHealthScore),
      topContributors,
      weeklyTrend,
    };
  },
};
