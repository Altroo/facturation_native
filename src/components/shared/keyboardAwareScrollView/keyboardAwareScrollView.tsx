import { createContext, useState, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import { KeyboardAwareScrollView as NativeKeyboardAwareScrollView } from 'react-native-keyboard-controller';

// Searchable fields tell their nearest form how much room their results need.
export const KeyboardSuggestionsContext = createContext<Dispatch<SetStateAction<number>> | undefined>(undefined);

export const withKeyboardAwareScrollView = (ScrollComponent: typeof NativeKeyboardAwareScrollView) => {
	const WithKeyboardAwareScrollView = ({
		bottomOffset = 32,
		extraKeyboardSpace = 0,
		...props
	}: ComponentProps<typeof NativeKeyboardAwareScrollView>) => {
		const [suggestionsSpace, setSuggestionsSpace] = useState(0);
		return (
			<KeyboardSuggestionsContext value={setSuggestionsSpace}>
				<ScrollComponent
					{...props}
					bottomOffset={bottomOffset + suggestionsSpace}
					extraKeyboardSpace={extraKeyboardSpace + suggestionsSpace}
				/>
			</KeyboardSuggestionsContext>
		);
	};
	WithKeyboardAwareScrollView.displayName = 'WithKeyboardAwareScrollView';
	return WithKeyboardAwareScrollView;
};

export default withKeyboardAwareScrollView(NativeKeyboardAwareScrollView);
