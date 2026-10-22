import type { DocumentPickerAsset } from 'expo-document-picker';

export type TypeArticleType = 'Produit' | 'Service';
export type CurrencyType = 'MAD' | 'EUR' | 'USD';
export type SalePriceBasis = 'HT' | 'TTC';
export type ImportArticlesResponseType = {
	total: number;
	created: number;
	errors: Array<{ row: number; message: string }>;
};
export type ArticleSchemaType = {
	type_article: TypeArticleType;
	photo: string | ArrayBuffer | null;
	photo_cropped: string | ArrayBuffer | null;
	reference: string;
	company: number;
	emplacement?: number | null;
	marque?: number | null;
	categorie?: number | null;
	unite?: number | null;
	designation?: string;
	prix_achat?: number;
	devise_prix_achat?: CurrencyType;
	prix_vente?: number;
	prix_vente_base?: SalePriceBasis;
	devise_prix_vente?: CurrencyType;
	tva?: number;
	stock_minimum?: number;
	remarque?: string;
	globalError?: string;
};
export type ArticlesQueryParams = {
	company_id: number;
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	archived?: boolean;
	[key: string]: string | number | boolean | undefined;
};
// The system picker returns a URI on native and a browser File on web.
export type ArticleImportFile = Pick<DocumentPickerAsset, 'uri' | 'name' | 'mimeType' | 'file'>;
