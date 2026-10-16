import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';

const ResetPasswordLayout = () => {
	useEffect(() => () => passwordResetStorage.resetCompletion(), []);
	return <Stack screenOptions={{ headerShown: false }} />;
};

export default ResetPasswordLayout;
