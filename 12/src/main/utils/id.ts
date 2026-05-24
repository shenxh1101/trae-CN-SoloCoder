import * as crypto from 'crypto';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateThreadId(messageId: string, references: string[] = [], inReplyTo?: string): string {
  const ids = [...references];
  if (inReplyTo) ids.push(inReplyTo);
  ids.push(messageId);
  
  const cleanedIds = ids.filter(id => id && id.trim().length > 0);
  
  if (cleanedIds.length === 0) {
    return crypto.createHash('sha256').update(messageId).digest('hex');
  }
  
  const rootId = cleanedIds[0].replace(/^<|>$/g, '').trim();
  return crypto.createHash('sha256').update(rootId).digest('hex');
}

export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}
