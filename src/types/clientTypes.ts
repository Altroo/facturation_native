export type TypeClientType = 'PM' | 'PP' | 'CD';

export type ClientsQueryParams = {
	company_id: number;
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	archived?: boolean;
	[key: string]: string | number | boolean | undefined;
};
