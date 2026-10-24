import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type { AiAssistRequest, AiAssistResponse } from '@/types/aiTypes';

export const aiAssistantApi = createApi({
	reducerPath: 'aiAssistantApi',
	baseQuery: axiosBaseQuery(() => {
		const instance = isAuthenticatedInstance();
		// Match the web: Django owns the model timeout. A normal mobile API
		// timeout must not cut off a longer grammar or translation response.
		instance.defaults.timeout = 0;
		return instance;
	}),
	endpoints: (builder) => ({
		assistText: builder.mutation<AiAssistResponse, AiAssistRequest>({
			query: (data) => ({ url: process.env.EXPO_PUBLIC_AI_ASSISTANT, method: 'POST', data }),
		}),
	}),
});

export const { useAssistTextMutation } = aiAssistantApi;
