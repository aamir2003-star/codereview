import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IStoredFile, IFileChunk } from './types';

export class FileStorageService {
  private uploadDir: string;
  private inFlightChunks: Map<string, IFileChunk[]> = new Map();

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public async saveChunk(chunk: IFileChunk): Promise<{ isComplete: boolean; file?: IStoredFile }> {
    if (!this.inFlightChunks.has(chunk.uploadId)) {
      this.inFlightChunks.set(chunk.uploadId, []);
    }

    const chunks = this.inFlightChunks.get(chunk.uploadId)!;
    chunks.push(chunk);

    if (chunks.length === chunk.totalChunks) {
      // Reassemble chunks
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const combinedBuffer = Buffer.concat(chunks.map((c) => c.data));
      this.inFlightChunks.delete(chunk.uploadId);

      const file = await this.saveBuffer(chunk.filename, 'general', combinedBuffer);
      return { isComplete: true, file };
    }

    return { isComplete: false };
  }

  public async saveBuffer(
    filename: string,
    category: string,
    data: Buffer
  ): Promise<IStoredFile> {
    const safeCategory = category.replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetDir = path.resolve(this.uploadDir, safeCategory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileId = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sanitizedFilename = path.basename(filename);
    const destinationPath = path.resolve(targetDir, `${fileId}_${sanitizedFilename}`);

    await fs.promises.writeFile(destinationPath, data);

    const hash = crypto.createHash('sha256').update(data).digest('hex');

    return {
      id: fileId,
      filename: sanitizedFilename,
      category: safeCategory,
      sizeBytes: data.length,
      mimeType: 'application/octet-stream',
      path: destinationPath,
      checksum: hash,
      uploadedAt: new Date(),
    };
  }

  public async getFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(filePath);
    } catch {
      return null;
    }
  }

  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const fileStorage = new FileStorageService();
