import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

// Tests use the committed template, independently of the developer's private .env.
Object.assign(process.env, parseEnv(readFileSync(join(__dirname, '.env.example'), 'utf8')));

jest.mock('@react-native-async-storage/async-storage', () =>
	jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('uniwind', () => ({ Uniwind: { setTheme: jest.fn() } }));
