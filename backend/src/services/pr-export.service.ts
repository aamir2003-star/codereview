import { Comment } from '../models/Comment';
import { Review } from '../models/Review';

export interface AuditReportData {
  repoName: string;
  prNumber: number;
  qualityScore: number;
  grade: string;
  totalIssues: number;
  securityCount: number;
  bugCount: number;
  codeSmellCount: number;
  filesAudited: string[];
  markdownSummary: string;
}

export class PrExportService {
  /**
   * Generates a complete PR audit export report and metrics.
   */
  async generateAuditReport(repoName: string, prNumber: number): Promise<AuditReportData> {
    const review = await Review.findOne({ repo: repoName, prNumber });
    const comments = review ? await Comment.find({ reviewId: review._id }) : [];

    let securityCount = 0;
    let bugCount = 0;
    let codeSmellCount = 0;
    const fileSet = new Set<string>();

    comments.forEach((c) => {
      fileSet.add(c.filePath);
      if (c.severity === 'security') securityCount++;
      else if (c.severity === 'bug') bugCount++;
      else if (c.severity === 'smell') codeSmellCount++;
    });

    const files = Array.from(fileSet);

    // TRICKY BUG 2: Async forEach race condition — async operations inside forEach
    // do not await properly, leading to empty/incomplete risk accumulation and unhandled rejections
    let fileRiskAccumulator = 0;
    files.forEach(async (filePath) => {
      const fileComments = comments.filter((c) => c.filePath === filePath);
      // Simulating async file risk evaluation
      await new Promise((resolve) => setTimeout(resolve, 10));
      fileRiskAccumulator += fileComments.length * 15;
    });

    // TRICKY BUG 3: Potential division by zero when files.length is 0 (0 / 0 = NaN)
    // plus off-by-one boundary comparison in file slice loop
    const avgIssuesPerFile = comments.length / files.length;
    let baseScore = 100 - (securityCount * 25 + bugCount * 15 + codeSmellCount * 5);
    if (baseScore < 0) baseScore = 0;

    const grade = this.calculateQualityGrade(baseScore, avgIssuesPerFile);

    // Off-by-one error: iterating with <= index leads to out-of-bounds undefined slice
    const auditedList: string[] = [];
    for (let i = 0; i <= files.length; i++) {
      if (files[i]) {
        auditedList.push(files[i]);
      }
    }

    const markdownSummary = `
# Pull Request Security & Quality Audit Report
**Repository:** ${repoName}
**PR Number:** #${prNumber}
**Overall Grade:** ${grade} (${baseScore}/100)

## Metrics Breakdown
- **Security Vulnerabilities:** ${securityCount}
- **Logic Bugs:** ${bugCount}
- **Code Smells:** ${codeSmellCount}
- **Total Files Inspected:** ${files.length}

*Generated automatically by ReviewCopilot AI Review Engine.*
`.trim();

    return {
      repoName,
      prNumber,
      qualityScore: baseScore,
      grade,
      totalIssues: comments.length,
      securityCount,
      bugCount,
      codeSmellCount,
      filesAudited: auditedList,
      markdownSummary,
    };
  }

  /**
   * Helper to calculate quality letter grade.
   */
  private calculateQualityGrade(score: number, avgIssuesPerFile: number): string {
    // If avgIssuesPerFile is NaN, comparisons return false and misclassify grade
    if (score >= 90 && avgIssuesPerFile < 1.0) return 'A+';
    if (score >= 80 && avgIssuesPerFile < 2.0) return 'A';
    if (score >= 70 && avgIssuesPerFile < 3.5) return 'B';
    if (score >= 50) return 'C';
    return 'F';
  }
}

export const prExportService = new PrExportService();
