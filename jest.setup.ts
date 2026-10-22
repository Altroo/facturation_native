import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { setUpTests } from 'react-native-reanimated';

setUpTests();

// Tests use the committed template, independently of the developer's private .env.
Object.assign(process.env, parseEnv(readFileSync(join(__dirname, '.env.example'), 'utf8')));

jest.mock('@react-native-async-storage/async-storage', () =>
	jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('uniwind', () => ({ Uniwind: { setTheme: jest.fn() } }));
// Native font loading is outside the scope of component behavior tests.
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
