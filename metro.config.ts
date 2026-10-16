import { getDefaultConfig } from 'expo/metro-config';
import { withUniwindConfig } from 'uniwind/metro';
import { sep } from 'node:path';

// Expo and Uniwind declare different Metro resolver types for this shared runtime config.
const expoConfig = getDefaultConfig(__dirname) as unknown as Parameters<typeof withUniwindConfig>[0];
const config = withUniwindConfig(expoConfig, {
	cssEntryFile: './src/styles/globals.css',
	dtsFile: './src/uniwind-types.d.ts',
});
const resolveRequest = config.resolver?.resolveRequest;

export default {
	...config,
	resolver: {
		...config.resolver,
		resolveRequest: (context, moduleName, platform) => {
			// Uniwind 1.12 omits RN 0.88's AssetRegistry. Expo Asset has no UI to style.
			const isNativeAssetLoader =
				platform !== 'web' &&
				moduleName === 'react-native' &&
				context.originModulePath.includes(`${sep}node_modules${sep}expo-asset${sep}`);
			const resolver = isNativeAssetLoader ? expoConfig.resolver?.resolveRequest : resolveRequest;
			return (resolver ?? context.resolveRequest)(context, moduleName, platform);
		},
	},
} satisfies typeof config;
