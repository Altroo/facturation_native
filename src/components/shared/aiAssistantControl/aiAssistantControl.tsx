import { useRef, useState, type FC } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import diff from 'fast-diff';
import CustomMenu from '@/components/nativeElements/customMenu/customMenu';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import { LanguageFlag } from '@/components/shared/languageSwitcher/languageSwitcher';
import { useAssistTextMutation } from '@/store/services/aiAssistant';
import type { AiAssistAction, AiAssistRequest, AiAssistResponse } from '@/types/aiTypes';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	value: string;
	onApply: (value: string) => void;
	context: string;
	disabled?: boolean;
	maxLength?: number;
};

const normalizeForComparison = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

const EnabledAiAssistantControl: FC<Props> = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess } = useToast();
	const [assistText, { isLoading }] = useAssistTextMutation();
	const pending = useRef(false);
	const [result, setResult] = useState<AiAssistResponse | null>(null);
	const [lastRequest, setLastRequest] = useState<AiAssistRequest | null>(null);
	const [error, setError] = useState('');
	const [stage, setStage] = useState<'language' | 'preview' | null>(null);
	const controlsDisabled = props.disabled || isLoading || !props.value.trim() || props.value.length > 5000;
	const stale = Boolean(result && props.value !== result.original_text);
	const tooLong = Boolean(result && props.maxLength && result.suggested_text.length > props.maxLength);
	const canApply = Boolean(result) && !props.disabled && !isLoading && !stale && !tooLong;
	const changes = result ? diff(result.original_text, result.suggested_text) : [];
	const close = () => {
		setStage(null);
		setResult(null);
		setError('');
	};
	const handleResponse = (request: AiAssistRequest, response: AiAssistResponse) => {
		const unchanged = normalizeForComparison(request.text) === normalizeForComparison(response.suggested_text);
		if (unchanged && (request.action === 'fix_grammar' || request.action === 'professionalize')) {
			close();
			onSuccess(request.action === 'fix_grammar' ? t.aiAssistant.alreadyCorrect : t.aiAssistant.alreadyProfessional);
			return;
		}
		setResult(response);
	};
	const send = async (request: AiAssistRequest) => {
		if (pending.current || props.disabled) return;
		pending.current = true;
		setLastRequest(request);
		setResult(null);
		setError('');
		setStage('preview');
		try {
			handleResponse(request, await assistText(request).unwrap());
		} catch (requestError) {
			setError(extractApiErrorMessage(requestError, t.aiAssistant.requestError));
		} finally {
			pending.current = false;
		}
	};
	const run = async (action: AiAssistAction, target_language?: 'fr' | 'en') => {
		if (controlsDisabled) return;
		await send({ action, text: props.value, source_language: 'auto', target_language, context: props.context });
	};
	const retry = async () => {
		if (!lastRequest || controlsDisabled) return;
		// Like the web, retry uses the current field if the user has edited it.
		await send({ ...lastRequest, text: props.value });
	};
	const renderDiff = (variant: 'original' | 'suggestion') => (
		<Text selectable className="font-sans text-sm leading-6 text-ink dark:text-slate-100">
			{changes.map(([operation, text], index) => {
				const changed = variant === 'original' ? operation === diff.DELETE : operation === diff.INSERT;
				if (operation !== diff.EQUAL && !changed) return null;
				return (
					<Text
						key={`${operation}-${index}`}
						testID={changed ? `assistant-${variant}-change` : undefined}
						className={
							changed
								? variant === 'original'
									? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
									: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
								: undefined
						}
					>
						{text}
					</Text>
				);
			})}
		</Text>
	);
	return (
		<>
			<View className="self-end">
				<CustomMenu
					label={t.aiAssistant.previewTitle}
					disabled={controlsDisabled}
					icon={
						isLoading ? (
							<ActivityIndicator color={colors.brand} />
						) : (
							<MaterialIcons name="auto-awesome" size={22} color={colors.brand} />
						)
					}
					actions={[
						{
							label: t.aiAssistant.translate,
							onClick: () => setStage('language'),
							icon: <MaterialIcons name="translate" size={22} color={colors.slate[400]} />,
						},
						{
							label: t.aiAssistant.fixGrammar,
							onClick: () => void run('fix_grammar'),
							icon: <MaterialIcons name="spellcheck" size={22} color={colors.slate[400]} />,
						},
						{
							label: t.aiAssistant.professionalize,
							onClick: () => void run('professionalize'),
							icon: <MaterialIcons name="work-outline" size={22} color={colors.slate[400]} />,
						},
					]}
				/>
			</View>
			{props.value.length > 5000 && (
				<Text accessibilityRole="alert" className="font-sans text-xs text-slate-500 dark:text-slate-400">
					{t.aiAssistant.textTooLong}
				</Text>
			)}
			{stage !== null && (
				<BottomSheet
					visible
					title={stage === 'language' ? t.aiAssistant.translate : t.aiAssistant.previewTitle}
					onClose={close}
					testID="ai-assistant-sheet"
					titleIcon={<MaterialIcons name="auto-awesome" size={24} color={colors.brand} />}
				>
					<ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
						{stage === 'language' ? (
							<CustomChoiceButtons
								label={t.aiAssistant.chooseLanguage}
								value={undefined}
								columns={2}
								items={[
									{ value: 'fr', label: t.aiAssistant.translateToFrench, icon: <LanguageFlag language="fr" /> },
									{ value: 'en', label: t.aiAssistant.translateToEnglish, icon: <LanguageFlag language="en" /> },
								]}
								onChange={(language) => void run('translate', language)}
							/>
						) : (
							<>
								{isLoading && <ActivityIndicator accessibilityRole="progressbar" color={colors.brand} />}
								{result && (
									<>
										<SectionCard title={t.aiAssistant.original} icon="notes">
											<View testID="original-text">{renderDiff('original')}</View>
										</SectionCard>
										<SectionCard title={t.aiAssistant.suggestion} icon="auto-awesome">
											<View testID="suggested-text">{renderDiff('suggestion')}</View>
										</SectionCard>
									</>
								)}
								{!!error && (
									<Text accessibilityRole="alert" className="font-sans text-sm text-red-600 dark:text-red-300">
										{error}
									</Text>
								)}
								{stale && (
									<Text accessibilityRole="alert" className="font-sans text-sm text-amber-700 dark:text-amber-300">
										{t.aiAssistant.fieldChanged}
									</Text>
								)}
								{tooLong && (
									<Text accessibilityRole="alert" className="font-sans text-sm text-amber-700 dark:text-amber-300">
										{t.aiAssistant.suggestionTooLong}
									</Text>
								)}
							</>
						)}
					</ScrollView>
					{stage === 'preview' && (
						<View className="gap-3">
							<PrimaryLoadingButton
								buttonText={t.aiAssistant.useSuggestion}
								active={canApply}
								loading={isLoading}
								startIcon={<MaterialIcons name="check" size={20} color={colors.white} />}
								onClick={() => {
									if (result && canApply) {
										props.onApply(result.suggested_text);
										close();
									}
								}}
							/>
							<PrimaryLoadingButton
								buttonText={t.aiAssistant.tryAgain}
								active={!controlsDisabled}
								loading={false}
								inverted
								startIcon={<MaterialIcons name="refresh" size={20} color={colors.brand} />}
								onClick={() => void retry()}
							/>
						</View>
					)}
				</BottomSheet>
			)}
		</>
	);
};

const AiAssistantControl: FC<Props> = (props: Props) => {
	if (process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED !== 'true') return null;
	return <EnabledAiAssistantControl {...props} />;
};

export default AiAssistantControl;
