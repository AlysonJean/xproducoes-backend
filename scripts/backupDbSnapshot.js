/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Cifra os arquivos do snapshot (Fase 2.7): o dump anterior gravava cada tabela — incluindo
// passwordHash, tokens de reset de senha e dados de clientes — como JSON em texto puro em
// disco. Mesma cifra/derivação de src/utils/tokenEncryption.ts, duplicada aqui de propósito:
// este script roda direto com `node`, sem passar pelo build TS do app.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCRYPTED_EXT = ".json.enc";

// Exportado (também) para permitir verificação manual direta destas funções reais —
// ver instruções de verificação no final deste arquivo / no commit desta mudança.
export function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY não encontrado no ambiente — obrigatório para cifrar o backup.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptJson(value, key) {
  const plainBuffer = Buffer.from(JSON.stringify(value, null, 2), "utf8");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL não encontrado no ambiente.");
  }

  // Handles quoted values from .env files: DATABASE_URL="..."
  return raw.replace(/^\"|\"$/g, "");
}

function formatStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const stamp = formatStamp();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "..");
  const snapshotDir = path.join(projectRoot, "backups", `snapshot-${stamp}`);
  const dataDir = path.join(snapshotDir, "data");

  await ensureDir(dataDir);

  const client = new Client({
    connectionString: databaseUrl,
    statement_timeout: 120000,
  });

  await client.connect();
  const encryptionKey = getEncryptionKey();

  try {
    const dbMeta = await client.query(
      `SELECT current_database() AS database_name, now() AS exported_at`
    );

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);

    const tables = tablesResult.rows.map((row) => row.table_name);
    const counts = {};

    for (const tableName of tables) {
      const countRes = await client.query(`SELECT COUNT(*)::int AS total FROM "public"."${tableName}"`);
      const total = countRes.rows[0]?.total ?? 0;
      counts[tableName] = total;

      const rowsRes = await client.query(`SELECT * FROM "public"."${tableName}"`);
      const filePath = path.join(dataDir, `${tableName}${ENCRYPTED_EXT}`);
      await fs.writeFile(filePath, encryptJson(rowsRes.rows, encryptionKey));

      console.log(`Tabela ${tableName}: ${total} registro(s) exportado(s) (cifrado).`);
    }

    const dependenciesRes = await client.query(`
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, ccu.table_name
    `);

    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      database: dbMeta.rows[0]?.database_name ?? null,
      tableCount: tables.length,
      tables,
      rowCounts: counts,
      foreignKeys: dependenciesRes.rows,
      notes: [
        "Snapshot lógico em JSON por tabela, cifrado (AES-256-GCM) com ENCRYPTION_KEY.",
        "Use scripts/restoreDbSnapshot.js para tentativa de restauração automatizada.",
      ],
    };

    // Manifest também cifrado — contém nomes de tabela, contagens e estrutura de FKs.
    await fs.writeFile(
      path.join(snapshotDir, `manifest${ENCRYPTED_EXT}`),
      encryptJson(manifest, encryptionKey)
    );

    console.log(`Snapshot cifrado criado em: ${snapshotDir}`);
  } finally {
    await client.end();
  }
}

// Só roda o backup de verdade quando o arquivo é executado diretamente (node
// scripts/backupDbSnapshot.js) — permite importar getEncryptionKey/encryptJson para
// verificação manual (ver commit desta mudança) sem disparar uma conexão real ao banco.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Falha ao criar snapshot:", error);
    process.exitCode = 1;
  });
}
