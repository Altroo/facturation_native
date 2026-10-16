export type ColorMode = 'light' | 'dark';

export const resolveColorMode = (value: string | undefined): ColorMode => (value === 'dark' ? 'dark' : 'light');
