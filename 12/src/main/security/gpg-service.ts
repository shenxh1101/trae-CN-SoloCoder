import * as openpgp from 'openpgp';
import { DatabaseService } from '../database';
import { GpgKey } from '../../shared/types';
import { generateId } from '../utils/id';

interface DecryptResult {
  content: string;
  signedBy?: string[];
  valid: boolean;
}

interface VerifyResult {
  valid: boolean;
  signedBy?: string;
  error?: string;
}

export class GpgService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.initializeOpenPGP();
  }

  private initializeOpenPGP(): void {
    try {
      openpgp.config.showComment = false;
      openpgp.config.showVersion = false;
      openpgp.config.preferredHashAlgorithm = openpgp.enums.hash.sha512;
      openpgp.config.preferredSymmetricAlgorithm = openpgp.enums.symmetric.aes256;
      openpgp.config.preferredCompressionAlgorithm = openpgp.enums.compression.zlib;
    } catch (error) {
      console.error('Failed to initialize OpenPGP:', error);
    }
  }

  async listKeys(type?: 'public' | 'private'): Promise<GpgKey[]> {
    try {
      return await this.dbService.getGpgKeys(type);
    } catch (error) {
      console.error('Failed to list GPG keys:', error);
      throw error;
    }
  }

  async importKey(armoredKey: string): Promise<GpgKey> {
    try {
      const keys = await openpgp.readKeys({ armoredKeys: armoredKey });
      if (keys.length === 0) {
        throw new Error('No keys found in the provided key data');
      }

      const key = keys[0];
      const fingerprint = key.getFingerprint();
      const keyId = key.getKeyID().toHex();
      const user = key.getUserIDs()[0] || '';
      const email = this.extractEmail(user);
      const isPrivate = key.isPrivate();
      const type = isPrivate ? 'private' : 'public';
      const armored = await key.armor();
      const creationTime = key.getCreationTime();
      const createdAt = creationTime instanceof Date ? creationTime.getTime() : creationTime;
      const expirationTime = await key.getExpirationTime();
      const expiresAt = expirationTime ? (expirationTime instanceof Date ? expirationTime.getTime() : expirationTime) : undefined;
      const isRevoked = await key.isRevoked();

      const allKeys = await this.dbService.getGpgKeys();
      const existing = allKeys.find(k => k.fingerprint === fingerprint && k.type === type);
      if (existing) {
        return existing;
      }

      const gpgKey: Omit<GpgKey, 'id'> = {
        type,
        fingerprint,
        keyId,
        userId: user,
        email,
        armored,
        createdAt,
        expiresAt,
        isRevoked
      };

      return await this.dbService.addGpgKey(gpgKey);
    } catch (error) {
      console.error('Failed to import GPG key:', error);
      throw error instanceof Error ? error : new Error('Failed to import GPG key');
    }
  }

  async exportKey(keyId: string): Promise<string> {
    try {
      const key = await this.dbService.getGpgKey(keyId);
      if (!key) {
        throw new Error('Key not found');
      }
      return key.armored;
    } catch (error) {
      console.error('Failed to export GPG key:', error);
      throw error;
    }
  }

  async deleteKey(keyId: string): Promise<void> {
    try {
      const key = await this.dbService.getGpgKey(keyId);
      if (!key) {
        throw new Error('Key not found');
      }
      await this.dbService.deleteGpgKey(keyId);
    } catch (error) {
      console.error('Failed to delete GPG key:', error);
      throw error;
    }
  }

  async generateKeyPair(name: string, email: string, passphrase?: string, keyBits: number = 4096): Promise<{ publicKey: GpgKey; privateKey: GpgKey }> {
    try {
      const { publicKey, privateKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: keyBits,
        userIDs: [{ name, email }],
        passphrase: passphrase || undefined,
        format: 'armored'
      });

      const importedPublicKey = await this.importKey(publicKey);
      const importedPrivateKey = await this.importKey(privateKey);

      return {
        publicKey: importedPublicKey,
        privateKey: importedPrivateKey
      };
    } catch (error) {
      console.error('Failed to generate GPG key pair:', error);
      throw error instanceof Error ? error : new Error('Failed to generate GPG key pair');
    }
  }

  async encrypt(content: string, recipientKeyIds: string[], signWithKeyId?: string, passphrase?: string): Promise<string> {
    try {
      const keys = await this.dbService.getGpgKeys();
      const recipientKeys: openpgp.Key[] = [];

      for (const keyId of recipientKeyIds) {
        const key = keys.find(k => k.id === keyId || k.keyId === keyId || k.fingerprint === keyId);
        if (!key) {
          throw new Error(`Recipient key not found: ${keyId}`);
        }
        if (key.type !== 'public') {
          throw new Error(`Key ${keyId} is not a public key`);
        }
        const parsedKeys = await openpgp.readKeys({ armoredKeys: key.armored });
        recipientKeys.push(parsedKeys[0]);
      }

      const message = await openpgp.createMessage({ text: content });

      let signingKey: openpgp.PrivateKey | undefined;
      if (signWithKeyId) {
        const signKey = keys.find(k => k.type === 'private' && (k.id === signWithKeyId || k.keyId === signWithKeyId || k.fingerprint === signWithKeyId));
        if (!signKey) {
          throw new Error(`Signing key not found: ${signWithKeyId}`);
        }
        if (signKey.type !== 'private') {
          throw new Error(`Signing key ${signWithKeyId} is not a private key`);
        }
        const parsedSignKeys = await openpgp.readPrivateKeys({ armoredKeys: signKey.armored });
        signingKey = parsedSignKeys[0];
        if (passphrase) {
          try {
            signingKey = await openpgp.decryptKey({
              privateKey: signingKey,
              passphrase
            });
          } catch (error) {
            throw new Error('Invalid passphrase for signing key');
          }
        }
      }

      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: recipientKeys,
        signingKeys: signingKey,
        format: 'armored'
      });

      return encrypted as string;
    } catch (error) {
      console.error('Failed to encrypt content:', error);
      throw error instanceof Error ? error : new Error('Failed to encrypt content');
    }
  }

  async decrypt(encryptedContent: string, passphrase?: string): Promise<DecryptResult> {
    try {
      const keys = await this.dbService.getGpgKeys('private');
      const message = await openpgp.readMessage({ armoredMessage: encryptedContent });

      const keyIds = message.getEncryptionKeyIDs ? message.getEncryptionKeyIDs() : [];
      let decryptionKey: openpgp.PrivateKey | undefined;

      for (const storedKey of keys) {
        const parsedKeys = await openpgp.readPrivateKeys({ armoredKeys: storedKey.armored });
        const key = parsedKeys[0];

        const keyMatches = keyIds.length === 0 || keyIds.some(kid => {
          const keyKeyIds = key.getKeyIDs();
          return keyKeyIds.some(kkid => kkid.toHex() === kid.toHex());
        });

        if (keyMatches) {
          try {
            if (passphrase) {
              const decrypted = await openpgp.decryptKey({
                privateKey: key,
                passphrase
              });
              decryptionKey = decrypted;
              break;
            } else {
              decryptionKey = key;
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (!decryptionKey) {
        throw new Error('No suitable decryption key found');
      }

      const { data: decrypted, signatures } = await openpgp.decrypt({
        message,
        decryptionKeys: decryptionKey,
        expectSigned: false,
        format: 'utf8'
      });

      let signedBy: string[] = [];
      let valid = true;

      if (signatures && signatures.length > 0) {
        const publicKeys = await this.dbService.getGpgKeys('public');
        signedBy = [];

        for (const sig of signatures) {
          const signingKeyId = sig.keyID.toHex();
          let keyFound = false;

          for (const pubKey of publicKeys) {
            try {
              const parsedPubKeys = await openpgp.readKeys({ armoredKeys: pubKey.armored });
              const verified = await sig.verified;
              if (verified) {
                signedBy.push(pubKey.email || pubKey.userId);
                keyFound = true;
                break;
              }
            } catch {
              continue;
            }
          }

          if (!keyFound) {
            valid = false;
          }
        }
      }

      return {
        content: decrypted as string,
        signedBy: signedBy.length > 0 ? signedBy : undefined,
        valid
      };
    } catch (error) {
      console.error('Failed to decrypt content:', error);
      throw error instanceof Error ? error : new Error('Failed to decrypt content');
    }
  }

  async sign(content: string, keyId: string, passphrase?: string): Promise<string> {
    try {
      const keys = await this.dbService.getGpgKeys('private');
      const signKey = keys.find(k => k.id === keyId || k.keyId === keyId || k.fingerprint === keyId);

      if (!signKey) {
        throw new Error(`Signing key not found: ${keyId}`);
      }

      const parsedKeys = await openpgp.readPrivateKeys({ armoredKeys: signKey.armored });
      let signingKey = parsedKeys[0];

      if (passphrase) {
        try {
          signingKey = await openpgp.decryptKey({
            privateKey: signingKey,
            passphrase
          });
        } catch (error) {
          throw new Error('Invalid passphrase for signing key');
        }
      }

      const message = await openpgp.createCleartextMessage({ text: content });

      const signed = await openpgp.sign({
        message,
        signingKeys: signingKey,
        format: 'armored'
      });

      return signed as string;
    } catch (error) {
      console.error('Failed to sign content:', error);
      throw error instanceof Error ? error : new Error('Failed to sign content');
    }
  }

  async verify(signedContent: string, signature?: string, keyId?: string): Promise<VerifyResult> {
    try {
      const publicKeys = await this.dbService.getGpgKeys('public');

      let message: openpgp.Message<string> | openpgp.CleartextMessage;
      let detachedSignature: openpgp.Signature | undefined;

      if (signature) {
        message = await openpgp.createMessage({ text: signedContent });
        detachedSignature = await openpgp.readSignature({ armoredSignature: signature });
      } else {
        try {
          message = await openpgp.readCleartextMessage({ cleartextMessage: signedContent });
        } catch {
          message = await openpgp.readMessage({ armoredMessage: signedContent });
        }
      }

      let verifyKeys: openpgp.Key[] = [];

      if (keyId) {
        const specificKey = publicKeys.find(k => k.id === keyId || k.keyId === keyId || k.fingerprint === keyId);
        if (!specificKey) {
          throw new Error(`Verification key not found: ${keyId}`);
        }
        const parsed = await openpgp.readKeys({ armoredKeys: specificKey.armored });
        verifyKeys = [parsed[0]];
      } else {
        for (const key of publicKeys) {
          const parsed = await openpgp.readKeys({ armoredKeys: key.armored });
          verifyKeys.push(parsed[0]);
        }
      }

      if (verifyKeys.length === 0) {
        return {
          valid: false,
          error: 'No public keys available for verification'
        };
      }

      const verificationPromises = verifyKeys.map(async (key) => {
        try {
          let verified;
          if (detachedSignature) {
            verified = await openpgp.verify({
              message: message as openpgp.Message<string>,
              signature: detachedSignature,
              verificationKeys: key
            });
          } else {
            verified = await openpgp.verify({
              message: message as openpgp.CleartextMessage,
              verificationKeys: key
            });
          }

          const signatures = verified.signatures;
          for (const sig of signatures) {
            try {
              const valid = await sig.verified;
              if (valid) {
                return {
                  valid: true,
                  signedBy: (key.getUserIDs()[0] || '')
                };
              }
            } catch {
              continue;
            }
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(verificationPromises);
      const validResult = results.find(r => r !== null);

      if (validResult) {
        return validResult;
      }

      return {
        valid: false,
        error: 'Signature verification failed'
      };
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  async encryptBinary(data: Uint8Array, recipientKeyIds: string[]): Promise<Uint8Array> {
    try {
      const keys = await this.dbService.getGpgKeys();
      const recipientKeys: openpgp.Key[] = [];

      for (const keyId of recipientKeyIds) {
        const key = keys.find(k => k.id === keyId || k.keyId === keyId || k.fingerprint === keyId);
        if (!key || key.type !== 'public') {
          throw new Error(`Recipient key not found: ${keyId}`);
        }
        const parsedKeys = await openpgp.readKeys({ armoredKeys: key.armored });
        recipientKeys.push(parsedKeys[0]);
      }

      const message = await openpgp.createMessage({ binary: data });
      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: recipientKeys,
        format: 'binary'
      });

      return encrypted as Uint8Array;
    } catch (error) {
      console.error('Failed to encrypt binary data:', error);
      throw error instanceof Error ? error : new Error('Failed to encrypt binary data');
    }
  }

  async decryptBinary(encryptedData: Uint8Array, passphrase?: string): Promise<Uint8Array> {
    try {
      const keys = await this.dbService.getGpgKeys('private');
      const message = await openpgp.readMessage({ binaryMessage: encryptedData });

      for (const storedKey of keys) {
        const parsedKeys = await openpgp.readPrivateKeys({ armoredKeys: storedKey.armored });
        let key = parsedKeys[0];

        try {
          if (passphrase) {
            key = await openpgp.decryptKey({
              privateKey: key,
              passphrase
            });
          }

          const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: key,
            format: 'binary'
          });

          return decrypted as Uint8Array;
        } catch (error) {
          continue;
        }
      }

      throw new Error('No suitable decryption key found');
    } catch (error) {
      console.error('Failed to decrypt binary data:', error);
      throw error instanceof Error ? error : new Error('Failed to decrypt binary data');
    }
  }

  private extractEmail(userId: string): string {
    const emailMatch = userId.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }
    if (userId.includes('@')) {
      return userId.trim();
    }
    return '';
  }
}
