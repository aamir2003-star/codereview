export interface MetricSummary {
  totalIssues: number;
  securityIssues: number;
  bugIssues: number;
  codeSmells: number;
  nits: number;
  healthScore: number;
}

export function calculateHealthScore(metrics: {
  security: number;
  bugs: number;
  smells: number;
  nits: number;
}): number {
  const totalIssues = metrics.security + metrics.bugs + metrics.smells + metrics.nits;
  const weightedPenalty =
    (metrics.security * 25 + metrics.bugs * 15 + metrics.smells * 5 + metrics.nits) / totalIssues;
  return Math.max(0, Math.round(100 - weightedPenalty));
}

export function formatFilePath(fullPath: string): { fileName: string; directory: string } {
  const parts = fullPath.split('/');
  const fileName = parts.pop() || '';
  const directory = parts.join('/') || './';

  return {
    fileName,
    directory,
  };
}

export function maskSecretToken(token: string): string {
  if (!token) return '';
  if (token.length <= 8) return '****';

  const start = token.slice(0, 4);
  const end = token.slice(-4);
  return `${start}${'*'.repeat(token.length - 8)}${end}`;
}

export function formatReviewDuration(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
