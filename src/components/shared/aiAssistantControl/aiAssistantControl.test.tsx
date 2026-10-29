import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AiAssistantControl from './aiAssistantControl';
import { translations } from '@/translations';
import { useAssistTextMutation } from '@/store/services/aiAssistant';
import type { AiAssistResponse } from '@/types/aiTypes';

jest.mock('@/store/services/aiAssistant', () => ({ useAssistTextMutation: jest.fn() }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/components/shared/languageSwitcher/languageSwitcher', () => ({ LanguageFlag: () => null }));
jest.mock('@/components/nativeElements/customMenu/customMenu', () => {
	const { View, Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const MockMenu = (props: { label: string; disabled: boolean; actions: { label: string; onClick: () => void }[] }) => (
		<View accessibilityLabel={props.label}>
			{props.actions.map((action) => (
				<Pressable
					key={action.label}
					accessibilityRole="button"
					accessibilityLabel={action.label}
					disabled={props.disabled}
					onPress={action.onClick}
				>
					<Text>{action.label}</Text>
				</Pressable>
			))}
		</View>
	);
	return MockMenu;
});
const mockOnSuccess = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useToast: () => ({ onSuccess: mockOnSuccess }),
}));

const t = translations.fr.aiAssistant;
const assistText = jest.fn();
const response: AiAssistResponse = {
	original_text: 'Le rapport sont prêt.',
	suggested_text: 'Le rapport est prêt.',
	detected_language: 'fr',
	model: 'test-model',
	cached: false,
	processing_ms: 12,
};
beforeEach(() => {
	jest.clearAllMocks();
	process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED = 'true';
	jest
		.mocked(useAssistTextMutation)
		.mockReturnValue([assistText, { isLoading: false }] as unknown as ReturnType<typeof useAssistTextMutation>);
	assistText.mockReturnValue({ unwrap: () => Promise.resolve(response) });
});
afterEach(() => {
	process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED = 'false';
});

describe('AiAssistantControl', () => {
	it('stays hidden with the same rollout flag as the web', async () => {
		process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED = 'false';
		await render(<AiAssistantControl value={response.original_text} context="form" onApply={jest.fn()} />);
		expect(screen.queryByRole('button')).toBeNull();
		expect(useAssistTextMutation).not.toHaveBeenCalled();
	});

	it.each([
		['fr', t.translateToFrench],
		['en', t.translateToEnglish],
	] as const)('offers %s translation and applies only after confirmation', async (language, label) => {
		const onApply = jest.fn();
		await render(<AiAssistantControl value={response.original_text} context="article" onApply={onApply} />);
		await fireEvent.press(screen.getByRole('button', { name: t.translate }));
		await fireEvent.press(screen.getByRole('button', { name: label }));
		await screen.findByTestId('suggested-text');
		expect(assistText).toHaveBeenCalledWith({
			action: 'translate',
			text: response.original_text,
			source_language: 'auto',
			target_language: language,
			context: 'article',
		});
		expect(onApply).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.useSuggestion }));
		expect(onApply).toHaveBeenCalledWith(response.suggested_text);
	});

	it.each([
		[t.fixGrammar, 'fix_grammar'],
		[t.professionalize, 'professionalize'],
	] as const)('runs %s and highlights changes before applying', async (label, action) => {
		await render(<AiAssistantControl value={response.original_text} context="form" onApply={jest.fn()} />);
		await fireEvent.press(screen.getByRole('button', { name: label }));
		await screen.findByTestId('suggested-text');
		expect(assistText).toHaveBeenCalledWith(
			expect.objectContaining({ action, text: response.original_text, source_language: 'auto' }),
		);
		expect(screen.getAllByTestId('assistant-original-change').length).toBeGreaterThan(0);
		expect(screen.getAllByTestId('assistant-suggestion-change').length).toBeGreaterThan(0);
	});

	it('cancels the preview without changing the form', async () => {
		const onApply = jest.fn();
		await render(<AiAssistantControl value={response.original_text} context="form" onApply={onApply} />);
		await fireEvent.press(screen.getByRole('button', { name: t.fixGrammar }));
		await screen.findByTestId('suggested-text');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		expect(screen.queryByTestId('ai-assistant-sheet')).toBeNull();
		expect(onApply).not.toHaveBeenCalled();
	});

	it('keeps the source on failure and retries with the latest field text', async () => {
		assistText
			.mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { message: 'Model unavailable' } }) })
			.mockReturnValueOnce({ unwrap: () => Promise.resolve({ ...response, original_text: 'New text' }) });
		const view = await render(<AiAssistantControl value={response.original_text} context="form" onApply={jest.fn()} />);
		await fireEvent.press(screen.getByRole('button', { name: t.fixGrammar }));
		await screen.findByText('Model unavailable');
		await view.rerender(<AiAssistantControl value="New text" context="form" onApply={jest.fn()} />);
		await fireEvent.press(screen.getByRole('button', { name: t.tryAgain }));
		await screen.findByTestId('suggested-text');
		expect(assistText).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'New text', action: 'fix_grammar' }));
	});

	it.each([
		[t.fixGrammar, t.alreadyCorrect],
		[t.professionalize, t.alreadyProfessional],
	] as const)('toasts unchanged %s results without a preview', async (label, message) => {
		assistText.mockReturnValue({
			unwrap: () => Promise.resolve({ ...response, suggested_text: ` ${response.original_text}\n` }),
		});
		await render(<AiAssistantControl value={response.original_text} context="form" onApply={jest.fn()} />);
		await fireEvent.press(screen.getByRole('button', { name: label }));
		await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledWith(message));
		expect(screen.queryByTestId('ai-assistant-sheet')).toBeNull();
	});

	it('does not overwrite a changed field or apply a suggestion longer than the field permits', async () => {
		const onApply = jest.fn();
		const view = await render(
			<AiAssistantControl value={response.original_text} context="form" onApply={onApply} maxLength={5} />,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.fixGrammar }));
		await screen.findByTestId('suggested-text');
		expect(screen.getByText(t.suggestionTooLong)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.useSuggestion })).toBeDisabled();
		await view.rerender(<AiAssistantControl value="Changed" context="form" onApply={onApply} />);
		expect(screen.getByText(t.fieldChanged)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.useSuggestion })).toBeDisabled();
		expect(onApply).not.toHaveBeenCalled();
	});

	it.each(['', ' '.repeat(5), 'x'.repeat(5001)])(
		'disables assistance for an empty or excessive source',
		async (value) => {
			await render(<AiAssistantControl value={value} context="form" onApply={jest.fn()} />);
			expect(screen.getByRole('button', { name: t.fixGrammar })).toBeDisabled();
			expect(assistText).not.toHaveBeenCalled();
		},
	);

	it('disables actions while a request is running', async () => {
		jest
			.mocked(useAssistTextMutation)
			.mockReturnValue([assistText, { isLoading: true }] as unknown as ReturnType<typeof useAssistTextMutation>);
		await render(<AiAssistantControl value={response.original_text} context="form" onApply={jest.fn()} />);
		expect(screen.getByRole('button', { name: t.fixGrammar })).toBeDisabled();
	});
});
