import { Component, type ContextType, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { reloadAppAsync } from 'expo';
import { LanguageContext } from '@/contexts/languageContext';
import type { ErrorBoundaryProps, ErrorBoundaryState } from '@/types/uiTypes';

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child
 * component tree and display a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	static contextType = LanguageContext;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error to monitoring service in production
		if (process.env.NODE_ENV === 'production') {
			// Could integrate with Sentry, LogRocket, etc.
			// For now, just suppress the error in production
		} else {
			// In development, log to console for debugging
			console.error('ErrorBoundary caught an error:', error, errorInfo);
		}
	}

	handleReset = (): void => {
		this.setState({ hasError: false, error: null, reloadFailed: false });
	};
	handleReload = async () => {
		if (this.state.reloading) return;
		this.setState({ reloading: true, reloadFailed: false });
		try {
			await reloadAppAsync();
		} catch {
			this.setState({ reloadFailed: true });
		} finally {
			this.setState({ reloading: false });
		}
	};
	render(): ReactNode {
		const { t } = this.context as ContextType<typeof LanguageContext>;
		if (!this.state.hasError) return this.props.children;
		if (this.props.fallback) return this.props.fallback;
		return (
			<View className="flex-1 justify-center gap-5 bg-white p-6 dark:bg-night">
				<MaterialIcons name="error-outline" size={64} color="#dc2626" />
				<Text className="font-poppins-semibold text-xl text-ink dark:text-white">{t.errors.errorOccurred}</Text>
				<Text className="text-base text-ink dark:text-white">{t.errors.errorOccurredMessage}</Text>
				{process.env.NODE_ENV !== 'production' && this.state.error && (
					<Text className="text-red-600 dark:text-red-300">{this.state.error.message}</Text>
				)}
				{!!this.state.reloadFailed && (
					<Text accessibilityRole="alert" className="text-red-600 dark:text-red-300">
						{t.errors.errorOccurredMessage}
					</Text>
				)}
				<Pressable
					accessibilityRole="button"
					onPress={this.handleReset}
					className="min-h-11 justify-center rounded-xl bg-brand p-3"
				>
					<Text className="text-center font-poppins-semibold text-white">{t.common.retry}</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					disabled={this.state.reloading}
					accessibilityState={{ disabled: this.state.reloading }}
					onPress={() => void this.handleReload()}
					className="min-h-11 justify-center rounded-xl border border-slate-300 p-3"
				>
					<Text className="text-center text-ink dark:text-white">{t.common.refreshPage}</Text>
				</Pressable>
			</View>
		);
	}
}
export default ErrorBoundary;
