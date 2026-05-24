export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const hashString = (str: string, algorithm: 'sha256' | 'md5' = 'sha256'): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export const encodeBase64 = (data: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(data)));
  } catch {
    return Buffer.from(data).toString('base64');
  }
};

export const decodeBase64 = (data: string): string => {
  try {
    return decodeURIComponent(escape(atob(data)));
  } catch {
    return Buffer.from(data, 'base64').toString('utf-8');
  }
};

export const encryptData = async (data: string, key: string): Promise<string> => {
  if (!window.crypto || !window.crypto.subtle) {
    return btoa(data);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const decryptData = async (encrypted: string, key: string): Promise<string> => {
  if (!window.crypto || !window.crypto.subtle) {
    return atob(encrypted);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combined = new Uint8Array(encrypted.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  return new TextDecoder().decode(decrypted);
};

export const validatePasswordStrength = (password: string): {
  score: number;
  label: string;
  suggestions: string[];
} => {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else suggestions.push('密码长度至少8位');

  if (/[a-z]/.test(password)) score++;
  else suggestions.push('包含小写字母');

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('包含大写字母');

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('包含数字');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push('包含特殊字符');

  let label = '弱';
  if (score >= 4) label = '强';
  else if (score >= 3) label = '中';

  return { score, label, suggestions };
};

export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? local.charAt(0) + '*'.repeat(Math.min(local.length - 2, 5)) + local.charAt(local.length - 1)
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
};

export const generateRandomPassword = (length = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
};
