// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**'],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js', '__mocks__/**'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
    // jest.mock() must precede imports, and mock factories use require()
    rules: { 'import/first': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
]);
