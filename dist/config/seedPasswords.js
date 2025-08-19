"use strict";
/**
 * ✅ SECURE SEED CONFIGURATION
 * Sistema seguro de senhas para ambiente de desenvolvimento
 * - Senhas geradas criptograficamente seguras
 * - Nunca hardcoded no código fonte
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPasswords = void 0;
const crypto_1 = require("crypto");
// ✅ CRYPTOGRAPHICALLY SECURE PASSWORD GENERATION
const generateSecurePassword = (length = 16) => {
    const randomBuffer = (0, crypto_1.randomBytes)(Math.ceil((length * 3) / 4));
    return randomBuffer
        .toString("base64")
        .replace(/[+/]/g, "")
        .substring(0, length);
};
// ✅ DETERMINISTIC PASSWORD GENERATION (for development consistency)
const generateDeterministicPassword = (seed, length = 16) => {
    const hash = (0, crypto_1.createHash)("sha256")
        .update(seed + process.env.NODE_ENV)
        .digest("hex");
    return hash.substring(0, length);
};
// ✅ SECURE SEED PASSWORDS
const seedPasswords = {
    // Use environment variables or generate secure passwords
    admin: process.env.SEED_ADMIN_PASSWORD ||
        (process.env.NODE_ENV === "development"
            ? generateDeterministicPassword("admin_seed")
            : generateSecurePassword(16)),
    client: process.env.SEED_CLIENT_PASSWORD ||
        (process.env.NODE_ENV === "development"
            ? generateDeterministicPassword("client_seed")
            : generateSecurePassword(16)),
    collaborator: process.env.SEED_COLLABORATOR_PASSWORD ||
        (process.env.NODE_ENV === "development"
            ? generateDeterministicPassword("collaborator_seed")
            : generateSecurePassword(16)),
};
exports.seedPasswords = seedPasswords;
// ✅ LOG GENERATED PASSWORDS (DEVELOPMENT ONLY)
if (process.env.NODE_ENV === "development") {
    console.log("\n🔐 SENHAS GERADAS PARA DESENVOLVIMENTO:");
    console.log("======================================");
    console.log(`👤 Admin: ${seedPasswords.admin}`);
    console.log(`👥 Cliente: ${seedPasswords.client}`);
    console.log(`🤝 Colaborador: ${seedPasswords.collaborator}`);
    console.log("======================================\n");
    console.log("💡 Para usar senhas personalizadas, defina as variáveis de ambiente:");
    console.log("   SEED_ADMIN_PASSWORD=sua_senha_admin");
    console.log("   SEED_CLIENT_PASSWORD=sua_senha_cliente");
    console.log("   SEED_COLLABORATOR_PASSWORD=sua_senha_colaborador\n");
}
