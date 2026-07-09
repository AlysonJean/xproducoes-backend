/* eslint-disable no-console */
/**
 * One-off data migration (Fase 2.4): encrypts any User.googleRefreshToken values
 * still stored in plain text, so existing rows don't have to wait for a natural
 * "reconnect" (OAuth callback) to get encrypted.
 *
 * Not required for correctness — src/utils/tokenEncryption.ts already reads
 * plaintext-or-encrypted transparently — but running this closes the exposure
 * window immediately instead of leaving old rows in plain text indefinitely.
 *
 * Same algorithm/derivation as src/utils/tokenEncryption.ts (duplicated here,
 * deliberately: this script runs directly with `node`, not through the app's
 * TS build, so it can't import from src/ without a compiled dist/).
 *
 * Usage: node scripts/encryptOAuthTokens.js           (dry run — reports only)
 *        node scripts/encryptOAuthTokens.js --apply    (writes the changes)
 */
import crypto from "node:crypto";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY não encontrado no ambiente — defina antes de rodar este script.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptSecret(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não encontrado no ambiente.");
  return raw.replace(/^"|"$/g, "");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const key = getEncryptionKey();
  const client = new Client({ connectionString: getDatabaseUrl(), statement_timeout: 120000 });
  await client.connect();

  try {
    const { rows } = await client.query(
      `SELECT id, "googleRefreshToken" FROM "public"."User" WHERE "googleRefreshToken" IS NOT NULL`
    );

    const plaintextRows = rows.filter((r) => !r.googleRefreshToken.startsWith(ENCRYPTED_PREFIX));

    console.log(`Usuários com googleRefreshToken: ${rows.length}`);
    console.log(`Já cifrados: ${rows.length - plaintextRows.length}`);
    console.log(`Em texto puro (a cifrar): ${plaintextRows.length}`);

    if (!apply) {
      console.log("\nDry run — nada foi alterado. Rode com --apply para gravar as mudanças.");
      return;
    }

    for (const row of plaintextRows) {
      const encrypted = encryptSecret(row.googleRefreshToken, key);
      await client.query(`UPDATE "public"."User" SET "googleRefreshToken" = $1 WHERE id = $2`, [
        encrypted,
        row.id,
      ]);
      console.log(`Usuário ${row.id}: refresh token cifrado.`);
    }

    console.log(`\n${plaintextRows.length} registro(s) atualizado(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Falha ao cifrar tokens OAuth existentes:", error);
  process.exitCode = 1;
});
