// ESLint config para ESLint v9+
const config = async () => {
  const tsPlugin = (await import('@typescript-eslint/eslint-plugin')).default;
  const tsParser = (await import('@typescript-eslint/parser')).default;
  const prettierRules = (await import('eslint-config-prettier')).default;
  return [
    {
      ignores: [
        'dist/',
        'build/',
        'node_modules/',
        '*.config.js',
        '*.config.ts',
        '*.json',
        '*.md',
        '*.env*',
        'uploads/',
        'logs/',
        'public/',
        'scripts/',
        'docs/',
        'patches/',
        'coverage/',
        'tests/**',
        '**/*.test.ts',
        '**/*.test.js',
        '**/__tests__/**',
      ],
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          projectService: {
            allowDefaultProject: ['*.js'],
            defaultProject: './tsconfig.json'
          },
          sourceType: 'module',
        },
      },
      plugins: {
        '@typescript-eslint': tsPlugin,
      },
      rules: {
        // Fase 4 concluída: as 231 ocorrências originais foram eliminadas
        // progressivamente (uma por commit, arquivo por arquivo) até zero.
        // Promovido de 'warn' para 'error' + `lint` agora roda com
        // `--max-warnings 0`, tornando este um gate real de CI (igual ao frontend).
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['prisma/seed.ts'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          projectService: {
            allowDefaultProject: ['*.js'],
            defaultProject: './tsconfig.json'
          },
          sourceType: 'module',
        },
      },
      plugins: {
        '@typescript-eslint': tsPlugin,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['src/utils/__tests__/**/*.ts'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          projectService: {
            allowDefaultProject: ['*.js'],
            defaultProject: './tsconfig.test.json'
          },
          sourceType: 'module',
        },
      },
      plugins: {
        '@typescript-eslint': tsPlugin,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      plugins: {},
      rules: prettierRules.rules,
    },
  ];
};

export default config();
