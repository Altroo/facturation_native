/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = __dirname;
const nativeEntry = join(root, 'node_modules/react-native/index.js');
const uniwindEntry = join(root, 'node_modules/uniwind/src/components/index.ts');
const webEntry = join(root, 'node_modules/react-native-web/dist/index.js');

// Load the real Metro/Uniwind config in Node, where Tailwind's native bindings run.
const resolveImport = (origin: string, platform: string) =>
	JSON.parse(
		execFileSync(
			process.execPath,
			[
				'-e',
				`(async () => {
					const { createJiti } = require('jiti');
					const { join } = require('node:path');
					const { default: config } = await createJiti(join(process.cwd(), 'package.json')).import('./metro.config.ts');
					const [origin, platform] = process.argv.slice(1);
					const context = {
						originModulePath: join(process.cwd(), origin),
						resolveRequest: (_context, moduleName) => ({
							type: 'sourceFile',
							filePath: moduleName === 'uniwind/components'
								? join(process.cwd(), 'node_modules/uniwind/src/components/index.ts')
								: platform === 'web'
									? join(process.cwd(), 'node_modules/react-native-web/dist/index.js')
									: require.resolve('react-native'),
						}),
					};
					console.log(JSON.stringify(config.resolver.resolveRequest(context, 'react-native', platform)));
				})().catch((error) => { console.error(error); process.exitCode = 1; });`,
				origin,
				platform,
			],
			{ cwd: root, encoding: 'utf8' },
		),
	);

describe('Metro configuration', () => {
	it.each(['ios', 'android'])('keeps Expo Asset connected to the real native registry on %s', (platform) => {
		expect(resolveImport('node_modules/expo-asset/build/Asset.js', platform)).toEqual({
			type: 'sourceFile',
			filePath: nativeEntry,
		});
	});

	it('still resolves native app components through Uniwind for Tailwind classes', () => {
		expect(resolveImport('src/app/_layout.tsx', 'ios')).toEqual({
			type: 'sourceFile',
			filePath: uniwindEntry,
		});
	});

	it('preserves the web resolver for Expo Asset', () => {
		expect(resolveImport('node_modules/expo-asset/build/Asset.js', 'web')).toEqual({
			type: 'sourceFile',
			filePath: webEntry,
		});
	});
});
