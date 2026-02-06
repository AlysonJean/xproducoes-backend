const { createDefaultPreset } = require("ts-jest");

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true, // Acelera a transpilação
    }],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 10000, // Reduzido de 20s para 10s
  maxWorkers: "50%", // Usa metade dos cores para paralelizar
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