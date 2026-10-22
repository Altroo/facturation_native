import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';

const ResetPasswordLayout = () => {
	const reduceMotion = useReducedMotion();
	useEffect(() => () => passwordResetStorage.resetCompletion(), []);
	return <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'slide_from_right' }} />;
};

export default ResetPasswordLayout;
