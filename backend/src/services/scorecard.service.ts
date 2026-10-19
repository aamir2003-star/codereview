import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Comment, Severity } from '../models/Comment';
import { AuditLog, AuditAction } from '../models/AuditLog';

export interface ScorecardMetrics {
  totalFiles: number;
  totalIssues: number;
  securityIssues: number;
  bugs: number;
  codeSmells: number;
  nits: number;
  resolvedIssues: number;
  resolutionRate: number;
}

export interface CategoryScores {
  security: number;
  reliability: number;
  maintainability: number;
}

export interface QualityScorecard {
  reviewId: string;
  pullRequest: {
    owner: string;
    repo: string;
    pullNumber: number;
    title: string;
    url: string;
  };
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  metrics: ScorecardMetrics;
  categoryScores: CategoryScores;
  recommendations: string[];
  evaluatedAt: Date;
}

export class ScorecardService {
  /**
   * Calculates a deterministic Code Quality & Reliability Scorecard (0-100)
   * for a completed review based on severity distribution, file coverage, and resolutions.
   */
  async calculateScorecard(reviewId: string): Promise<QualityScorecard> {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new Error(`Invalid review ID format: ${reviewId}`);
    }

    const reviewObjectId = new mongoose.Types.ObjectId(reviewId);
    const review = await Review.findById(reviewObjectId);

    if (!review) {
      throw new Error(`Review not found for ID: ${reviewId}`);
    }

    const comments = await Comment.find({ reviewId: reviewObjectId });

    let securityCount = 0;
    let bugCount = 0;
    let smellCount = 0;
    let nitCount = 0;
    let resolvedCount = 0;

    for (const comment of comments) {
      if (comment.resolved) {
        resolvedCount++;
      }

      switch (comment.severity as Severity) {
        case 'security':
          securityCount++;
          break;
        case 'bug':
          bugCount++;
          break;
        case 'smell':
          smellCount++;
          break;
        case 'nit':
          nitCount++;
          break;
        default:
          break;
      }
    }

    const totalIssues = comments.length;
    const resolutionRate =
      totalIssues === 0 ? 100 : Math.round((resolvedCount / totalIssues) * 100);

    // Calculate Category Scores (0 - 100 scale)
    // Security score penalizes vulnerabilities heavily (30 pts per unaddressed issue)
    const securityDeductions = Math.min(100, securityCount * 30);
    const securityScore = Math.max(0, 100 - securityDeductions);

    // Reliability score penalizes runtime logic bugs (15 pts per unaddressed bug)
    const reliabilityDeductions = Math.min(100, bugCount * 15);
    const reliabilityScore = Math.max(0, 100 - reliabilityDeductions);

    // Maintainability score penalizes code smells (5 pts) and nits (2 pts)
    const maintainabilityDeductions = Math.min(
      100,
      smellCount * 5 + nitCount * 2
    );
    const maintainabilityScore = Math.max(0, 100 - maintainabilityDeductions);

    // Weighted Overall Score (Security: 40%, Reliability: 40%, Maintainability: 20%)
    const rawWeightedScore =
      securityScore * 0.4 + reliabilityScore * 0.4 + maintainabilityScore * 0.2;

    // Apply small bonus for high resolution rates if issues existed
    let adjustedScore = Math.round(rawWeightedScore);
    if (totalIssues > 0 && resolutionRate >= 80) {
      adjustedScore = Math.min(100, adjustedScore + 5);
    }

    const overallScore = Math.max(0, Math.min(100, adjustedScore));

    // Determine letter grade
    let grade: QualityScorecard['grade'] = 'F';
    if (overallScore >= 95) grade = 'A+';
    else if (overallScore >= 85) grade = 'A';
    else if (overallScore >= 75) grade = 'B';
    else if (overallScore >= 65) grade = 'C';
    else if (overallScore >= 50) grade = 'D';

    // Generate actionable recommendations
    const recommendations: string[] = [];

    if (securityCount > 0) {
      recommendations.push(
        `Critical: Resolve ${securityCount} security vulnerability${
          securityCount > 1 ? 'ies' : ''
        } before merging to production.`
      );
    }

    if (bugCount > 0) {
      recommendations.push(
        `High Priority: Address ${bugCount} runtime bug${
          bugCount > 1 ? 's' : ''
        } to prevent service degradation.`
      );
    }

    if (smellCount >= 3) {
      recommendations.push(
        `Refactoring: ${smellCount} code smells identified; consider extracting shared helpers or applying standard patterns.`
      );
    }

    if (totalIssues === 0) {
      recommendations.push(
        'Excellent work: No defects or vulnerabilities detected across reviewed changes.'
      );
    } else if (resolutionRate === 100) {
      recommendations.push(
        'Great job: All reported review findings have been successfully addressed.'
      );
    }

    let summary = '';
    if (overallScore >= 85) {
      summary = `High Quality (${grade}) - Code changes pass reliability and security checks with minimal risk.`;
    } else if (overallScore >= 65) {
      summary = `Moderate Quality (${grade}) - Changes contain actionable issues that should be addressed before deployment.`;
    } else {
      summary = `Needs Attention (${grade}) - Multiple high-severity issues or vulnerabilities require developer intervention.`;
    }

    return {
      reviewId: review._id.toString(),
      pullRequest: {
        owner: review.owner,
        repo: review.repo,
        pullNumber: review.pullNumber,
        title: review.prTitle || `PR #${review.pullNumber}`,
        url: review.prUrl,
      },
      overallScore,
      grade,
      summary,
      metrics: {
        totalFiles: review.totalFiles || 0,
        totalIssues,
        securityIssues: securityCount,
        bugs: bugCount,
        codeSmells: smellCount,
        nits: nitCount,
        resolvedIssues: resolvedCount,
        resolutionRate,
      },
      categoryScores: {
        security: securityScore,
        reliability: reliabilityScore,
        maintainability: maintainabilityScore,
      },
      recommendations,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Records an audit log event safely without throwing unhandled exceptions to callers.
   */
  async recordAuditEvent(params: {
    action: AuditAction;
    userId: mongoose.Types.ObjectId | string;
    owner: string;
    repo: string;
    pullNumber: number;
    reviewId?: mongoose.Types.ObjectId | string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const userObjectId =
        params.userId instanceof mongoose.Types.ObjectId
          ? params.userId
          : typeof params.userId === 'string' && mongoose.Types.ObjectId.isValid(params.userId)
          ? new mongoose.Types.ObjectId(params.userId)
          : null;

      if (!userObjectId) {
        return;
      }

      const reviewObjectId =
        params.reviewId instanceof mongoose.Types.ObjectId
          ? params.reviewId
          : typeof params.reviewId === 'string' && mongoose.Types.ObjectId.isValid(params.reviewId)
          ? new mongoose.Types.ObjectId(params.reviewId)
          : undefined;

      await AuditLog.create({
        action: params.action,
        userId: userObjectId,
        reviewId: reviewObjectId,
        owner: params.owner,
        repo: params.repo,
        pullNumber: params.pullNumber,
        metadata: params.metadata || {},
      });
    } catch (err) {
      // Non-fatal: Log audit error without failing the primary workflow
      console.warn(
        '[AuditService] Failed to record audit log entry:',
        err instanceof Error ? err.message : err
      );
    }
  }

  /**
   * Retrieves paginated audit history for a specific pull request.
   */
  async getAuditHistory(
    owner: string,
    repo: string,
    pullNumber: number,
    limit: number = 20
  ) {
    const sanitizedLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    return AuditLog.find({ owner, repo, pullNumber })
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .populate('userId', 'name username avatar')
      .lean();
  }
}

export const scorecardService = new ScorecardService();
