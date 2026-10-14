import { Request, Response } from 'express';
import { fileStorage } from '../storage/file-storage.service';
import { bundleAnalyzer } from '../storage/bundle-analyzer.service';

export const uploadController = {
  async handleChunk(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, chunkIndex, totalChunks, filename } = req.body;
      const rawData = req.body.data;

      if (!uploadId || chunkIndex === undefined || !totalChunks || !filename) {
        res.status(400).json({ error: 'Missing chunk metadata' });
        return;
      }

      const buffer = Buffer.from(rawData || '', 'base64');
      const result = await fileStorage.saveChunk({
        uploadId,
        chunkIndex: parseInt(chunkIndex, 10),
        totalChunks: parseInt(totalChunks, 10),
        filename,
        data: buffer,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to process file chunk' });
    }
  },

  async analyzeBundle(req: Request, res: Response): Promise<void> {
    try {
      const { baseStats, newStats } = req.body;
      if (!baseStats || !newStats) {
        res.status(400).json({ error: 'baseStats and newStats are required' });
        return;
      }

      const diff = bundleAnalyzer.analyzeBundleDiff(baseStats, newStats);
      res.status(200).json({ diff });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to analyze bundle stats' });
    }
  },
};
