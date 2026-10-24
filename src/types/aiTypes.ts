export type AiAssistAction = 'translate' | 'fix_grammar' | 'professionalize';
export type AiLanguage = 'auto' | 'fr' | 'en';

export type AiAssistRequest = {
	action: AiAssistAction;
	text: string;
	source_language: AiLanguage;
	target_language?: Exclude<AiLanguage, 'auto'>;
	context: string;
};

export type AiAssistResponse = {
	original_text: string;
	suggested_text: string;
	detected_language: 'fr' | 'en';
	model: string;
	cached: boolean;
	processing_ms: number;
};
