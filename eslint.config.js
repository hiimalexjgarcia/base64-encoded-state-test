import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: ['node_modules/', 'dist/', 'modernizr.js', 'webpack.config.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript specific
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // General
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'keyword-spacing': ['error'],
      'space-in-parens': ['error', 'never'],
      'space-before-blocks': ['error', 'always'],
      'space-infix-ops': 'error',
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'newline-before-return': 'error',
      'new-parens': 'error',
      'no-extra-parens': 'error',
      'no-multi-spaces': 'error',
      'no-tabs': 'error',
      'indent': ['error', 2],
    },
  },
];
