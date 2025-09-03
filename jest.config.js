const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 20000,
  // Evita rodar testes compilados em dist/ e duplicidades
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};