import 'server-only';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('EMAIL_SETTINGS_ENCRYPTION_KEY não está definida.');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      'EMAIL_SETTINGS_ENCRYPTION_KEY inválida. Ela deve ser uma string hexadecimal com 64 caracteres.'
    );
  }

  return Buffer.from(rawKey, 'hex');
}

export function encryptEmailSettingSecret(plainText: string): string {
  if (!plainText || !plainText.trim()) {
    throw new Error('Nenhum valor foi informado para criptografar.');
  }

  const key = getEncryptionKey();
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

export function decryptEmailSettingSecret(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.trim()) {
    throw new Error('Nenhum valor criptografado foi informado.');
  }

  const parts = encryptedPayload.split(':');

  if (parts.length !== 3) {
    throw new Error('Formato inválido do segredo criptografado.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const key = getEncryptionKey();
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
