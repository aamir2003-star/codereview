import { IBundleDiffResult } from './types';

export class BundleAnalyzerService {
  public analyzeBundleDiff(
    baseStats: { totalBytes: number; chunks?: Array<{ name: string; size: number }> },
    newStats: { totalBytes: number; chunks?: Array<{ name: string; size: number }> }
  ): IBundleDiffResult {
    const baseSize = baseStats.totalBytes || 0;
    const newSize = newStats.totalBytes || 0;
    const deltaBytes = newSize - baseSize;

    let percentChange = 0;
    if (baseSize > 0) {
      percentChange = Number(((deltaBytes / baseSize) * 100).toFixed(2));
    } else if (newSize > 0) {
      percentChange = 100;
    }

    const largestChunks = (newStats.chunks || [])
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    const warnings: string[] = [];
    if (deltaBytes > 250000) {
      warnings.push(`PR increases bundle size significantly (+${Math.round(deltaBytes / 1024)} KB)`);
    }
    if (percentChange > 15) {
      warnings.push(`Bundle size grew by ${percentChange}%, which exceeds recommended 10% threshold`);
    }

    return {
      baseSize,
      newSize,
      deltaBytes,
      percentChange,
      largestChunks,
      warnings,
    };
  }
}

export const bundleAnalyzer = new BundleAnalyzerService();
