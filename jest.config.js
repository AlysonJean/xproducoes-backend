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
  // Achado (auditoria): cobertura nunca tinha sido medida/gatilhada neste repo. Piso definido
  // um pouco abaixo da cobertura real medida em 2026-07-13 — não é uma meta aspiracional (subir
  // isso exigiria escrever um volume grande de testes novos, fora do escopo deste ciclo), é só
  // um piso para travar regressão: se alguém apagar testes ou adicionar bastante código sem
  // testar, o CI falha em vez de deixar a cobertura cair silenciosamente. Atualizado no mesmo
  // dia após os testes de caracterização de bookingService.ts (statements 40.10%, branches
  // 23.71%, functions 25.15%, lines 40.87% — piso original era 37/20/22/38).
  coverageThreshold: process.env.NODE_ENV === 'production' ? undefined : {
    global: {
      statements: 39,
      branches: 22,
      functions: 24,
      lines: 39,
    },
  },
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