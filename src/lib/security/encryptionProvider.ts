import { EncryptionProvider } from '../../types';
import * as crypto from 'crypto';

/**
 * NoOpEncryptionProvider (Development / Testing)
 * Fast, deterministic Base64 serialization without encryption key requirements.
 */
export class NoOpEncryptionProvider implements EncryptionProvider {
  public async encrypt(plaintext: string): Promise<string> {
    return Buffer.from(plaintext, 'utf-8').toString('base64');
  }

  public async decrypt(ciphertext: string): Promise<string> {
    return Buffer.from(ciphertext, 'base64').toString('utf-8');
  }
}

/**
 * AESGCMEncryptionProvider (Production AES-256-GCM)
 * Authenticated symmetric encryption with random 96-bit IV per encryption operation.
 */
export class AESGCMEncryptionProvider implements EncryptionProvider {
  private key: Buffer;

  constructor(secretKey?: string) {
    const rawKey = secretKey || process.env.SHIELD_ENCRYPTION_SECRET || 'privacy-layer-default-secret-key-32b!';
    // Ensure key is exactly 32 bytes (256 bits) using SHA-256
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  public async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Return iv:authTag:encrypted payload
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  public async decrypt(ciphertext: string): Promise<string> {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // Fallback for NoOp Base64 payloads or legacy unencrypted strings
      try {
        return Buffer.from(ciphertext, 'base64').toString('utf-8');
      } catch {
        throw new Error('Invalid ciphertext payload format');
      }
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
