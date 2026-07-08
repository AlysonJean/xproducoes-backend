/** @type {import("jest").Config} **/
const integrationIgnorePatterns = [
  "src/utils/__tests__/authTest\\.test\\.ts$",
  "src/utils/__tests__/cart\\.test\\.ts$",
  "src/utils/__tests__/category\\.test\\.ts$",
  "src/utils/__tests__/dashboard\\.test\\.ts$",
  "src/utils/__tests__/equipment\\.test\\.ts$",
  "src/utils/__tests__/faq\\.test\\.ts$",
  "src/utils/__tests__/kit\\.test\\.ts$",
  "src/utils/__tests__/payment\\.test\\.ts$",
  "src/utils/__tests__/portfolio\\.test\\.ts$",
  "src/utils/__tests__/review\\.test\\.ts$",
  "src/utils/__tests__/users\\.test\\.ts$",
  "src/utils/__tests__/userController\\.test\\.ts$",
  "src/utils/__tests__/cache\\.test\\.ts$",
];

const config = {
  testEnvironment: "node",
  forceExit: true,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true, // Acelera a transpilação
      useESM: true,
    }],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 10000, // Reduzido de 20s para 10s
  maxWorkers: "50%", // Usa metade dos cores para paralelizar
  // Evita rodar testes compilados em dist/ e duplicidades
  testPathIgnorePatterns: process.env.RUN_INTEGRATION_TESTS === 'true'
    ? ["/node_modules/", "/dist/"]
    : ["/node_modules/", "/dist/", ...integrationIgnorePatterns],
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

export default config;