/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = __dirname;
const runBabel = (filename?: string) =>
	JSON.parse(
		execFileSync(
			process.execPath,
			[
				'-e',
				`const babel = require('@babel/core');
				const filename = process.argv[1];
				if (!filename) {
					console.log(JSON.stringify(!!babel.loadPartialConfigSync({ cwd: process.cwd() })));
				} else {
					const fs = require('node:fs');
					const traverse = require('@babel/traverse').default;
					const source = filename.includes('.native.')
						? fs.readFileSync(filename, 'utf8')
						: 'useAnimatedStyle(() => ({ opacity: progress.value }), [progress]);';
					const result = babel.transformSync(source, {
						cwd: process.cwd(), filename, ast: true, code: false,
						caller: { name: 'metro', platform: filename.includes('.native.') ? 'ios' : 'web' },
					});
					const argumentsPerHook = [];
					traverse(result.ast, { CallExpression({ node }) {
						const callee = node.callee.type === 'SequenceExpression' ? node.callee.expressions.at(-1) : node.callee;
						const name = callee.type === 'Identifier' ? callee.name : callee.property?.name;
						if (['useAnimatedStyle', 'useAnimatedProps'].includes(name)) argumentsPerHook.push(node.arguments.length);
					}});
					console.log(JSON.stringify(argumentsPerHook));
				}`,
				...(filename ? [join(root, filename)] : []),
			],
			{ cwd: root, encoding: 'utf8' },
		),
	);

describe('Babel configuration', () => {
	it('loads without a filename when Metro computes the transformer cache key', () => {
		expect(runBabel()).toBe(true);
	});

	it.each(['Drawer', 'Overlay'])('removes ignored native dependencies from the published %s', (component) => {
		const hooks = runBabel(`node_modules/react-native-drawer-layout/src/views/${component}.native.tsx`);
		expect(hooks.length).toBeGreaterThan(0);
		expect(hooks.every((argumentCount: number) => argumentCount === 1)).toBe(true);
	});

	it('retains hook dependencies in the drawer web entry', () => {
		expect(runBabel('node_modules/react-native-drawer-layout/src/views/Overlay.tsx')).toEqual([2]);
	});

	it('leaves app animation hooks unchanged', () => {
		expect(runBabel('babel.config.test.ts')).toEqual([2]);
	});
});
