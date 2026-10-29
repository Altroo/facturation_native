import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ImagePreview from './imagePreview';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const uri = 'https://example.invalid/original-company-logo.png';

describe('ImagePreview', () => {
	it('shows the requested full image with its accessible label', async () => {
		await render(<ImagePreview uri={uri} label="Logo de l’entreprise" visible onClose={jest.fn()} />);
		const image = screen.getByLabelText('Logo de l’entreprise');
		expect(image).toHaveProp('source', { uri });
		expect(image).toHaveProp('resizeMode', 'contain');
	});

	it.each(['button', 'back'] as const)('closes through the %s action', async (action) => {
		const onClose = jest.fn();
		const Example = () => {
			const [visible, setVisible] = useState(true);
			return (
				<ImagePreview
					uri={uri}
					label="Logo"
					visible={visible}
					onClose={() => {
						onClose();
						setVisible(false);
					}}
				/>
			);
		};
		await render(<Example />);
		if (action === 'button') await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		else
			await fireEvent(
				screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
				'requestClose',
			);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByLabelText('Logo')).toBeNull();
		expect(screen.queryByRole('button', { name: translations.fr.common.close })).toBeNull();
	});

	it('does not expose preview content while closed', async () => {
		await render(<ImagePreview uri={uri} label="Logo" visible={false} onClose={jest.fn()} />);
		expect(screen.queryByLabelText('Logo')).toBeNull();
		expect(screen.queryByRole('button', { name: translations.fr.common.close })).toBeNull();
	});
});
