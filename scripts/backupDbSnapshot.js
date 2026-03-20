/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

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
      const filePath = path.join(dataDir, `${tableName}.json`);
      await fs.writeFile(filePath, JSON.stringify(rowsRes.rows, null, 2), "utf8");

      console.log(`Tabela ${tableName}: ${total} registro(s) exportado(s).`);
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
        "Snapshot lógico em JSON por tabela.",
        "Use scripts/restoreDbSnapshot.js para tentativa de restauração automatizada.",
      ],
    };

    await fs.writeFile(
      path.join(snapshotDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    console.log(`Snapshot criado em: ${snapshotDir}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Falha ao criar snapshot:", error);
  process.exitCode = 1;
});
