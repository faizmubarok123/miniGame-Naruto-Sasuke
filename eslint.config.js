import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        localStorage: 'readonly',
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',
        devicePixelRatio: 'readonly',
        OffscreenCanvas: 'readonly',
        navigator: 'readonly',
        matchMedia: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        CSS: 'readonly',
        CustomEvent: 'readonly',
        getComputedStyle: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        ResizeObserver: 'readonly',
        structuredClone: 'readonly',
        Event: 'readonly',
        TouchEvent: 'readonly',
        Touch: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-constant-condition': ['error', { checkLoops: false }]
    }
  },
  {
    files: ['tests/**'],
    languageOptions: {
      globals: {
        __adf: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        document: 'readonly',
        process: 'readonly',
        fetch: 'readonly'
      }
    }
  }
];
