import crypto from "crypto";
import { config } from "../config/environment";

/**
 * AES-256-GCM encryption for OAuth/social tokens stored at rest (e.g.
 * User.googleRefreshToken). Key is derived (SHA-256) from ENCRYPTION_KEY so any
 * format the operator puts there (openssl rand -base64 32, a hex string, a
 * passphrase) collapses to a valid 32-byte AES key.
 *
 * Backward-compat by design: decryptSecret() returns the input unchanged if it
 * doesn't carry the ENCRYPTED_PREFIX, so tokens stored before this change keep
 * working without a hard migration — they get re-encrypted the next time the
 * app writes that field (e.g. on OAuth reconnect).
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(config.encryptionKey).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function isEncryptedSecret(stored: string): boolean {
  return stored.startsWith(ENCRYPTED_PREFIX);
}

export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) {
    // Valor gravado antes desta mudança (texto puro) — devolve como está.
    return stored;
  }

  const raw = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
