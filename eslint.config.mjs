import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/drizzle/**',
      'coverage/**',
      '.playwright-cli/**',
      '.local/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['frontend/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message: 'Utiliza utilidades Tailwind; no añadas estilos inline propios.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > :matches(TemplateLiteral, BinaryExpression, ConditionalExpression, LogicalExpression)",
          message: 'Compón clases completas con la función cn() de lib/utils.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*.module.css', '**/*.module.css', 'styled-components', '@emotion/*'],
              message: 'Tailwind CSS 4 es el único sistema de estilos del frontend.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } },
  },
);
