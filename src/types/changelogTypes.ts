export interface ChangelogEntry {
	id: number;
	date: string;
	version: string;
	platform: 'web' | 'mobile' | 'both';
	title_fr: string;
	title_en: string;
	changes_fr: string[];
	changes_en: string[];
}
