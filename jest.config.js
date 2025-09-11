const { createDefaultPreset } = require("ts-jest");

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: process.env.NODE_ENV === 'production' ? 'tsconfig.json' : 'tsconfig.dev.json'
    }],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 20000,
  // Evita rodar testes compilados em dist/ e duplicidades
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // Só executa testes em desenvolvimento ou quando explicitamente solicitado
  testMatch: process.env.NODE_ENV === 'production' ? [] : [
    "**/__tests__/**/*.(js|ts)",
    "**/*.(test|spec).(js|ts)"
  ],
  // Desabilita testes em produção
  collectCoverage: process.env.NODE_ENV !== 'production',
  // Configuração condicional baseada no ambiente
  ...(process.env.NODE_ENV === 'production' && {
    // Em produção, não executa nenhum teste
    testMatch: [],
    collectCoverage: false,
    // Desabilita watch mode em produção
    watch: false,
    watchAll: false,
  })
};