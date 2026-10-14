export interface IFileChunk {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Buffer;
  filename: string;
}

export interface IStoredFile {
  id: string;
  filename: string;
  category: string;
  sizeBytes: number;
  mimeType: string;
  path: string;
  checksum: string;
  uploadedAt: Date;
}

export interface IBundleDiffResult {
  baseSize: number;
  newSize: number;
  deltaBytes: number;
  percentChange: number;
  largestChunks: Array<{ name: string; size: number }>;
  warnings: string[];
}
