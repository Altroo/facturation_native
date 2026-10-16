import { defineConfig, globalIgnores } from 'eslint/config';
import type { ESLint } from 'eslint';
import { fixupPluginRules } from '@eslint/compat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import expo from 'eslint-plugin-expo';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
	{
		files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
		plugins: {
			react: fixupPluginRules(react),
			'react-hooks': { rules: reactHooks.rules },
			import: fixupPluginRules(importPlugin),
			expo: fixupPluginRules(expo as unknown as ESLint.Plugin),
		},
		languageOptions: {
			globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly' },
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		settings: { react: { version: 'detect' } },
		rules: {
			// The shared React rules used by eslint-config-next on the web.
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'import/no-anonymous-default-export': 'warn',
			'react/no-unknown-property': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/jsx-no-target-blank': 'off',
			// Native-only framework checks replace Next.js and DOM checks.
			'expo/use-dom-exports': 'error',
			'expo/no-env-var-destructuring': 'error',
			'expo/no-dynamic-env-var': 'error',
		},
	},
	...tseslint.configs.recommended,
	prettier,
	{
		rules: {
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			// Enabled only in native; the web's setting is unchanged.
			'react-hooks/set-state-in-effect': 'error',
		},
	},
	globalIgnores([
		'dist/**',
		'build/**',
		'.expo/**',
		'coverage/**',
		'archives/**',
		'ios/**',
		'android/**',
		'expo-env.d.ts',
		'src/uniwind-types.d.ts',
	]),
]);
