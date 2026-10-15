import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey';

export interface ApiKeyRequest extends Request {
  apiKey?: {
    organizationId: string;
    scopes: string[];
  };
}

export async function requireApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const rawKey = req.headers['x-api-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!rawKey || typeof rawKey !== 'string') {
    res.status(401).json({ error: 'API key is required in x-api-key header or Bearer authorization' });
    return;
  }

  const prefix = rawKey.split('_')[0] || rawKey.slice(0, 8);
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const keyDoc = await ApiKey.findOne({ prefix, isActive: true });
  if (!keyDoc) {
    res.status(401).json({ error: 'Invalid or inactive API key' });
    return;
  }

  if (keyDoc.keyHash !== hash) {
    res.status(401).json({ error: 'Invalid API key secret' });
    return;
  }

  if (keyDoc.expiresAt && keyDoc.expiresAt.getTime() < Date.now()) {
    res.status(401).json({ error: 'API key has expired' });
    return;
  }

  keyDoc.lastUsedAt = new Date();
  await keyDoc.save();

  req.apiKey = {
    organizationId: keyDoc.organizationId.toString(),
    scopes: keyDoc.scopes,
  };

  next();
}
