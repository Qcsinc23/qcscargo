import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Custom rule to prevent hardcoded blue utilities for brand consistency
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/\\b(bg-blue-|text-blue-|border-blue-|from-blue-|to-blue-|indigo-|sophisticated-blue)/]',
          message: 'Avoid hardcoded blue color utilities. Use semantic tokens like bg-primary, text-primary instead. See BRAND_COLORS.md for guidelines.',
        },
      ],
    },
  },
)
