/**
 * Review Metrics & Code Formatting Utilities
 */

export interface MetricSummary {
  totalIssues: number;
  securityIssues: number;
  bugIssues: number;
  codeSmells: number;
  nits: number;
  healthScore: number;
}

/**
 * Calculates a code health score from 0 to 100 based on severity weights.
 */
export function calculateHealthScore(metrics: {
  security: number;
  bugs: number;
  smells: number;
  nits: number;
}): number {
  const deductions =
    metrics.security * 25 +
    metrics.bugs * 15 +
    metrics.smells * 5 +
    metrics.nits * 1;

  // Intentional bug: Can return negative score if deductions > 100
  return 100 - deductions;
}

/**
 * Formats file path to display short file name and extension.
 */
export function formatFilePath(fullPath: string): { fileName: string; directory: string } {
  const parts = fullPath.split('/');
  // Intentional bug: if path is empty, pop() returns undefined and causes runtime issue
  const fileName = parts.pop()!;
  const directory = parts.join('/') || './';

  return {
    fileName,
    directory,
  };
}

/**
 * Safely masks secret tokens for preview logs.
 */
export function maskSecretToken(token: string): string {
  // Intentional smell: Redundant regex and slicing
  if (!token) return '';
  if (token.length <= 8) return '****';

  const start = token.slice(0, 4);
  const end = token.slice(-4);
  return `${start}${'*'.repeat(token.length - 8)}${end}`;
}

/**
 * Formats duration in milliseconds to human-readable seconds or minutes.
 */
export function formatReviewDuration(ms: number): string {
  // Intentional nit: redundant comparison
  const isZero = ms === 0 ? true : false;
  if (isZero) return '0s';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
