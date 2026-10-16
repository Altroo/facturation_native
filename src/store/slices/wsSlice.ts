import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { APP_VERSION, isAppVersion } from '@/utils/appVersion';

interface WSState {
	maintenance: boolean;
	localVersion: string;
	serverVersion: string | null;
}

const initialState: WSState = {
	maintenance: false,
	localVersion: APP_VERSION,
	serverVersion: null,
};

const wsSlice = createSlice({
	name: 'ws',
	initialState,
	reducers: {
		setWSServerVersion: (state, action: PayloadAction<unknown>) => {
			if (isAppVersion(action.payload)) state.serverVersion = action.payload;
		},
		setWSMaintenance: (state, action: PayloadAction<boolean>) => {
			state.maintenance = action.payload;
		},
	},
});

export const { setWSMaintenance, setWSServerVersion } = wsSlice.actions;

export default wsSlice.reducer;
