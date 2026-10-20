import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NotificationType } from '@/types/notificationTypes';
import { initToken } from '@/store/slices/_initSlice';

interface NotificationState {
	unreadCount: number;
	latestNotification: NotificationType | null;
}

const initialState: NotificationState = {
	unreadCount: 0,
	latestNotification: null,
};

const notificationSlice = createSlice({
	name: 'notification',
	initialState,
	reducers: {
		setUnreadCount: (state, action: PayloadAction<number>) => {
			state.unreadCount = action.payload;
		},
		incrementUnreadCount: (state) => {
			state.unreadCount += 1;
		},
		setLatestNotification: (state, action: PayloadAction<NotificationType>) => {
			state.latestNotification = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(initToken, () => initialState);
	},
});

export const { setUnreadCount, incrementUnreadCount, setLatestNotification } = notificationSlice.actions;

export default notificationSlice.reducer;
