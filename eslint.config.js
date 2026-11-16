import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'public/pyodide/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
      'react-hooks': reactHooks,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'sim', pattern: 'src/sim/**' },
        { type: 'runtime-worker', pattern: 'src/runtime/worker/**' },
        { type: 'runtime-protocol', pattern: 'src/runtime/protocol.ts' },
        { type: 'runtime-client', pattern: 'src/runtime/client/**' },
        { type: 'persistence', pattern: 'src/persistence/**' },
        { type: 'stores', pattern: 'src/stores/**' },
        { type: 'ui', pattern: 'src/ui/**' },
        { type: 'engine', pattern: 'src/engine/**' },
        { type: 'playback', pattern: 'src/playback/**' },
        { type: 'learning', pattern: 'src/learning/**' },
        { type: 'mentor', pattern: 'src/mentor/**' },
        { type: 'game', pattern: 'src/game/**' },
        { type: 'editor', pattern: 'src/editor/**' },
        { type: 'content', pattern: 'src/content/**' },
        { type: 'audio', pattern: 'src/audio/**' },
        { type: 'app', pattern: 'src/app/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: ['sim'],
              disallow: [
                'runtime-worker',
                'runtime-protocol',
                'runtime-client',
                'persistence',
                'stores',
                'ui',
                'engine',
                'playback',
                'learning',
                'mentor',
                'game',
                'editor',
                'content',
                'audio',
                'app',
              ],
              message: 'src/sim/** must be pure TypeScript with zero external module dependencies.',
            },
            {
              from: ['runtime-worker'],
              disallow: ['ui', 'engine', 'stores', 'persistence', 'editor', 'audio', 'app', 'game'],
              message: 'src/runtime/worker/** cannot import UI, Three/Engine, Stores, Persistence, or DOM modules.',
            },
            {
              from: ['persistence'],
              disallow: ['ui', 'engine', 'editor', 'runtime-worker', 'runtime-client'],
              message: 'src/persistence/** only serializes DTOs and stores; never import UI, Engine, or Workers.',
            },
            {
              from: ['ui'],
              disallow: ['persistence', 'engine', 'runtime-worker'],
              message: 'src/ui/** must communicate with engine and persistence via src/stores/** and EventBus.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'three', '@react-three/*', 'idb', 'pyodide'],
              message: 'src/sim/** must remain pure deterministic TypeScript (no React, Three, IDB, or Pyodide).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/sim/** must not access DOM globals.' },
        { name: 'document', message: 'src/sim/** must not access DOM globals.' },
      ],
    },
  },
  {
    files: ['src/runtime/worker/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'three', '@react-three/*'],
              message: 'src/runtime/worker/** must not import React or Three.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Web Workers must not access window.' },
        { name: 'document', message: 'Web Workers must not access document.' },
      ],
    },
  }
);
