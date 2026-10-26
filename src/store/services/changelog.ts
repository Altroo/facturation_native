import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance } from '@/utils/helpers';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type { ChangelogEntry } from '@/types/changelogTypes';

export const changelogApi = createApi({
	reducerPath: 'changelogApi',
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getChangelog: builder.query<ChangelogEntry[], void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_CHANGELOG,
				method: 'GET',
				params: { platform: 'mobile' },
			}),
		}),
	}),
});

export const { useGetChangelogQuery } = changelogApi;
