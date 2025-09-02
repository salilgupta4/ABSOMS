import react from 'eslint-plugin-react';
import typescript from '@typescript-eslint/eslint-plugin';
import eslintJs from '@eslint/js';
import parser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        browser: true,
        es2020: true,
        node: true,
      },
    },
    plugins: {
      react,
      '@typescript-eslint': typescript,
    },
    rules: {
      ...eslintJs.configs.recommended.rules,
      ...typescript.configs['eslint-recommended'].rules,
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      // Add your custom rules here
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];