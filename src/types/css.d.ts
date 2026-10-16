declare module '*.css';

declare module '*.png' {
	const source: import('react-native').ImageRequireSource;
	export default source;
}

declare module '*.svg' {
	const source: import('react-native').ImageRequireSource;
	export default source;
}

declare module '*.ttf' {
	const source: number;
	export default source;
}
