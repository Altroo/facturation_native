import type { ConfigAPI, PluginObj, TransformOptions } from '@babel/core';

// Drawer 4.2 passes web dependency arrays that Reanimated 4.7 ignores on native.
// Omit only those native arguments, without modifying the installed package.
const nativeDrawerDependencies = (): PluginObj => ({
	visitor: {
		CallExpression: ({ node }) => {
			if (
				node.callee.type === 'Identifier' &&
				['useAnimatedStyle', 'useAnimatedProps'].includes(node.callee.name) &&
				node.arguments.length === 2 &&
				node.arguments[1].type === 'ArrayExpression'
			)
				node.arguments.pop();
		},
	},
});

module.exports = (api: ConfigAPI): TransformOptions => {
	api.cache.forever();
	return {
		presets: ['babel-preset-expo'],
		overrides: [
			{
				test: (filename) =>
					!!filename && /[/\\]node_modules[/\\]react-native-drawer-layout[/\\].*\.native\.[jt]sx?$/.test(filename),
				plugins: [nativeDrawerDependencies],
			},
		],
	};
};
