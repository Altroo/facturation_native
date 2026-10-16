import type { Config } from 'jest';

// Match Jest's CLI before loading config or test transforms.
process.env.NODE_ENV ??= 'test';

// Load the TypeScript config with jiti and pass it directly to Jest.
const main = async () => {
	const { resolve } = await import('node:path');
	const { createJiti } = await import('jiti');
	const { run } = await import('jest');
	const rootDir = resolve(__dirname, '..');
	const config = await createJiti(__filename).import<Config>('../jest.config.ts', { default: true });
	await run(['--config', JSON.stringify({ ...config, rootDir }), ...process.argv.slice(2)]);
};

void main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
