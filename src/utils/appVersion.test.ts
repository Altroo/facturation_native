import { APP_VERSION, isAppVersion, isNewerAppVersion } from './appVersion';
import { version } from '../../package.json';
import { expo } from '../../app.json';

it('uses the bundled package version in JavaScript and Expo config', () => {
	expect(APP_VERSION).toBe(version);
	expect(expo.version).toBe(version);
});

it.each(['0.0.0', '1.2.3', '2026.10.6'])('accepts %s', (value) => expect(isAppVersion(value)).toBe(true));
it.each([null, undefined, 1, '', '1', '1.0', '01.0.0', '1.0.0-beta', '1.0.0\n', '1000000.0.0'])(
	'rejects %s',
	(value) => {
		expect(isAppVersion(value)).toBe(false);
		expect(isNewerAppVersion(value, APP_VERSION)).toBe(false);
	},
);
it.each([
	['1.10.0', '1.9.9', true],
	['1.2.1', '1.2.0', true],
	['2.0.0', '1.99.9', true],
	['1.2.0', '1.2.0', false],
	['1.2.0', '1.10.0', false],
	['1.0.0', 'invalid', false],
])('compares %s with %s numerically', (candidate, current, expected) => {
	expect(isNewerAppVersion(candidate, current)).toBe(expected);
});
