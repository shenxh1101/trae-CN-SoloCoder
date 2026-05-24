import CryptoJS from 'crypto-js';

export function encrypt(content: string, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  });
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const encrypted = CryptoJS.AES.encrypt(content, key, { iv: iv });
  const saltStr = salt.toString();
  const ivStr = iv.toString();
  const encryptedStr = encrypted.toString();
  return `${saltStr}:${ivStr}:${encryptedStr}`;
}

export function decrypt(encryptedData: string, password: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      return null;
    }
    const [saltStr, ivStr, encryptedStr] = parts;
    const salt = CryptoJS.enc.Hex.parse(saltStr);
    const iv = CryptoJS.enc.Hex.parse(ivStr);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    });
    const decrypted = CryptoJS.AES.decrypt(encryptedStr, key, { iv: iv });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

export function verifyPassword(encryptedData: string, password: string): boolean {
  const result = decrypt(encryptedData, password);
  return result !== null;
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}
