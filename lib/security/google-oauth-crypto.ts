import 'server-only';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getGoogleOAuthEncryptionKey(): Buffer {
  const rawKey = process.env.GOOGLE_OAUTH_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('GOOGLE_OAUTH_ENCRYPTION_KEY nao esta definida.');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      'GOOGLE_OAUTH_ENCRYPTION_KEY invalida. Use uma string hexadecimal com 64 caracteres.',
    );
  }

  return Buffer.from(rawKey, 'hex');
}

export function encryptGoogleOAuthToken(plainText: string): string {
  if (!plainText?.trim()) {
    throw new Error('Token OAuth vazio para criptografar.');
  }

  const key = getGoogleOAuthEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptGoogleOAuthToken(encryptedPayload: string): string {
  if (!encryptedPayload?.trim()) {
    throw new Error('Token OAuth criptografado ausente.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato invalido do token OAuth criptografado.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getGoogleOAuthEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
