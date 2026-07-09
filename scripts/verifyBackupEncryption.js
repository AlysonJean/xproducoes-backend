/* eslint-disable no-console */
/**
 * Verificação manual/reproduzível da Fase 2.7 (backup cifrado): não é um teste Jest porque
 * backupDbSnapshot.js / restoreDbSnapshot.js são ESM puro executado via `node`, fora do
 * pipeline de transform do Jest (ver decisão registrada no commit desta mudança). Em vez
 * disso, este script importa as funções reais (exportadas) dos dois arquivos de backup e
 * prova, com arquivos temporários e sem tocar em nenhum banco, que:
 *   1. o conteúdo gravado em disco não é JSON legível nem contém o texto sensível original;
 *   2. o par escreve/lê (backup → restore) round-tripa para o valor original;
 *   3. um snapshot legado (texto puro, sem sufixo .json.enc) ainda é lido corretamente.
 *
 * Uso: ENCRYPTION_KEY=qualquer-valor node scripts/verifyBackupEncryption.js
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { getEncryptionKey, encryptJson } from "./backupDbSnapshot.js";
import { readSnapshotJson } from "./restoreDbSnapshot.js";

async function main() {
  process.env.ENCRYPTION_KEY ||= "verify-script-local-key-not-for-prod";
  const key = getEncryptionKey();

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xproducoes-backup-verify-"));
  try {
    const sensitiveRow = { id: "u1", passwordHash: "bcrypt$2b$SENSITIVE_MARKER", email: "user@example.com" };

    // 1. O arquivo gravado no disco não deve conter o dado sensível em texto puro.
    const encryptedPath = path.join(tmpDir, "User.json.enc");
    await fs.writeFile(encryptedPath, encryptJson([sensitiveRow], key));
    const rawBytes = await fs.readFile(encryptedPath);
    assert.ok(!rawBytes.toString("latin1").includes("SENSITIVE_MARKER"), "FALHOU: o marcador sensível apareceu em texto puro no arquivo cifrado");
    console.log("[OK] Arquivo em disco não contém o dado sensível em texto puro.");

    // 2. Round-trip: o que foi cifrado pelo backup é lido de volta corretamente pelo restore.
    const restored = await readSnapshotJson(path.join(tmpDir, "User"), key);
    assert.deepEqual(restored, [sensitiveRow], "FALHOU: round-trip backup -> restore não preservou o conteúdo original");
    console.log("[OK] Round-trip backup -> restore preserva o conteúdo original.");

    // 3. Compatibilidade retroativa: um snapshot legado (texto puro) ainda deve ser lido.
    const legacyPath = path.join(tmpDir, "LegacyTable.json");
    await fs.writeFile(legacyPath, JSON.stringify([{ id: "legacy-1" }]), "utf8");
    const legacyRestored = await readSnapshotJson(path.join(tmpDir, "LegacyTable"), key);
    assert.deepEqual(legacyRestored, [{ id: "legacy-1" }], "FALHOU: snapshot legado em texto puro não foi lido corretamente");
    console.log("[OK] Snapshot legado (texto puro, anterior à Fase 2.7) ainda é restaurado corretamente.");

    console.log("\nTudo verificado com sucesso.");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Verificação falhou:", error);
  process.exitCode = 1;
});
