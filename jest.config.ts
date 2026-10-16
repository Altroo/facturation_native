import type { Config } from 'jest';

const config: Config = {
	preset: 'jest-expo',
	roots: ['<rootDir>/src'],
	transformIgnorePatterns: [
		'/node_modules/(?!(react-native|@react-native|expo|@expo|@expo-google-fonts|@shopify/flash-list|react-navigation|@react-navigation|standard-navigation|immer|@reduxjs|redux|react-redux|@redux-saga))',
		'/node_modules/react-native-reanimated/plugin/',
		'/node_modules/@react-native/babel-preset/',
	],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	fakeTimers: { doNotFake: ['queueMicrotask', 'nextTick'] },
	moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
	testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
	moduleDirectories: ['node_modules', '<rootDir>/'],
	collectCoverage: true,
	coverageReporters: ['text-summary', 'lcov', ['cobertura', { file: 'cobertura-coverage.xml' }]],
	coverageProvider: 'v8',
	coveragePathIgnorePatterns: ['/node_modules/'],
	collectCoverageFrom: [
		'src/**/*.{js,jsx,ts,tsx}',
		'!src/**/*.d.ts',
		'!src/types/**',
		'!src/**/index.{js,ts}',
		'!src/**/*.test.{js,jsx,ts,tsx}',
		'!src/uniwind-types.d.ts',
	],
	coverageDirectory: 'coverage',
	maxWorkers: '50%',
};

export default config;
