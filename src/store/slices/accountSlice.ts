import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AccountStateInterface } from '@/types/accountTypes';
import type { GroupClass, UserClass } from '@/models/classes';
import { initToken } from '@/store/slices/_initSlice';

const initialState: AccountStateInterface = {
	profil: {},
	groupes: [],
};

const accountSlice = createSlice({
	name: 'account',
	initialState: initialState,
	reducers: {
		setProfil: (state, action: PayloadAction<UserClass>) => {
			state.profil = action.payload;
		},
		setGroupes: (state, action: PayloadAction<GroupClass>) => {
			state.groupes = action.payload.group_titles;
		},
		setWSUserAvatar: (state, action: PayloadAction<{ avatar: string }>) => {
			// payload has user_avatar
			state.profil.avatar = action.payload.avatar;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(initToken, () => initialState);
	},
});

export const { setProfil, setGroupes, setWSUserAvatar } = accountSlice.actions;

export default accountSlice.reducer;
