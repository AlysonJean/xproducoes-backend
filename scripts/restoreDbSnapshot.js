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

  return raw.replace(/^\"|\"$/g, "");
}

function topologicalSort(tables, foreignKeys) {
  const inDegree = new Map();
  const graph = new Map();

  for (const table of tables) {
    inDegree.set(table, 0);
    graph.set(table, new Set());
  }

  for (const fk of foreignKeys) {
    const parent = fk.parent_table;
    const child = fk.child_table;
    if (!graph.has(parent) || !graph.has(child)) continue;

    if (!graph.get(parent).has(child)) {
      graph.get(parent).add(child);
      inDegree.set(child, (inDegree.get(child) || 0) + 1);
    }
  }

  const queue = [];
  for (const [table, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(table);
  }

  const order = [];
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);

    for (const next of graph.get(current) || []) {
      const nextDegree = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }

  // If cycles exist, append remaining tables at the end.
  if (order.length < tables.length) {
    for (const table of tables) {
      if (!order.includes(table)) order.push(table);
    }
  }

  return order;
}

async function main() {
  const snapshotArg = process.argv[2];
  if (!snapshotArg) {
    throw new Error("Informe o caminho do snapshot. Ex: node scripts/restoreDbSnapshot.js backups/snapshot-YYYYMMDD-HHMMSS");
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "..");
  const snapshotDir = path.resolve(projectRoot, snapshotArg);
  const manifestPath = path.join(snapshotDir, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  const tables = manifest.tables || [];
  const restoreOrder = topologicalSort(tables, manifest.foreignKeys || []);

  const client = new Client({
    connectionString: getDatabaseUrl(),
    statement_timeout: 120000,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    if (tables.length > 0) {
      const truncList = tables.map((t) => `\"public\".\"${t}\"`).join(", ");
      await client.query(`TRUNCATE TABLE ${truncList} RESTART IDENTITY CASCADE`);
    }

    for (const tableName of restoreOrder) {
      const tableFile = path.join(snapshotDir, "data", `${tableName}.json`);
      let rows = [];

      try {
        rows = JSON.parse(await fs.readFile(tableFile, "utf8"));
      } catch {
        rows = [];
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`Tabela ${tableName}: 0 registro(s) restaurado(s).`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colSql = columns.map((c) => `\"${c}\"`).join(", ");

      for (const row of rows) {
        const values = columns.map((c) => row[c]);
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");
        await client.query(
          `INSERT INTO \"public\".\"${tableName}\" (${colSql}) VALUES (${placeholders})`,
          values
        );
      }

      console.log(`Tabela ${tableName}: ${rows.length} registro(s) restaurado(s).`);
    }

    await client.query("COMMIT");
    console.log(`Restauração concluída com sucesso a partir de: ${snapshotDir}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Falha na restauração:", error);
  process.exitCode = 1;
});
