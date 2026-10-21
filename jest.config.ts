import type { Config } from 'jest';
import appConfig from './app.json';

const config: Config = {
	preset: 'jest-expo',
	resolver: 'react-native-reanimated/jest/resolver',
	roots: ['<rootDir>'],
	modulePathIgnorePatterns: ['<rootDir>/android/', '<rootDir>/ios/', '<rootDir>/dist/', '<rootDir>/coverage/'],
	// Compile app source as Metro does; keep Expo's preset transforms for dependencies and tests.
	transform: {
		'^(?!.*node_modules/).*src/(?!.*(?:__tests__/|\\.(?:test|spec)\\.|/setup(?:Autocomplete|Query)\\.tsx$)).*\\.[jt]sx?$':
			[
				require.resolve('babel-jest', { paths: [require.resolve('jest-expo/package.json')] }),
				{
					caller: {
						name: 'metro',
						bundler: 'jest',
						platform: 'ios',
						supportsReactCompiler: appConfig.expo.experiments.reactCompiler,
					},
				},
			],
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(react-native|@react-native|expo|@expo|@expo-google-fonts|@shopify/flash-list|react-navigation|@react-navigation|standard-navigation|immer|@reduxjs|redux|react-redux|@redux-saga))',
		'/node_modules/react-native-reanimated/plugin/',
		'/node_modules/@react-native/babel-preset/',
	],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	fakeTimers: { doNotFake: ['queueMicrotask', 'nextTick'] },
	moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
	testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[tj]s?(x)', '<rootDir>/*.test.ts'],
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
		'!src/components/nativeElements/customAutoCompleteSelect/setupAutocomplete.tsx',
		'!src/store/setupQuery.tsx',
		'!src/uniwind-types.d.ts',
	],
	coverageDirectory: 'coverage',
	maxWorkers: '50%',
};

export default config;
