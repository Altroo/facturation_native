import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChangelogTimeline } from './changelogTimeline';
import type { ChangelogEntry } from '@/types/changelogTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));

const entry: ChangelogEntry = {
	id: 1,
	date: '2026-10-26',
	version: '1.2.0',
	platform: 'mobile',
	title_fr: 'Votre application mobile',
	title_en: 'Your mobile app',
	changes_fr: ['Consultez vos documents.', 'Gérez vos clients.'],
	changes_en: ['View your documents.', 'Manage your clients.'],
};

describe('Changelog Timeline', () => {
	it.each(['fr', 'en'] as const)('shows the complete release in %s using the shared card heading', async (language) => {
		await render(<ChangelogTimeline entries={[entry]} language={language} refreshing={false} />);
		expect(screen.getByRole('header', { name: entry[`title_${language}`] })).toBeOnTheScreen();
		expect(screen.getByText(language === 'fr' ? '26 octobre 2026' : 'October 26, 2026')).toBeOnTheScreen();
		expect(screen.getByText(`Version ${entry.version}`)).toBeOnTheScreen();
		for (const change of entry[`changes_${language}`]) expect(screen.getByText(change)).toBeOnTheScreen();
	});

	it('does not invent a version for unversioned entries and keeps admin text as plain text', async () => {
		await render(
			<ChangelogTimeline
				entries={[{ ...entry, version: '', changes_fr: ['<b>Texte</b>'] }]}
				language="fr"
				refreshing={false}
			/>,
		);
		expect(screen.queryByText(/Version/)).toBeNull();
		expect(screen.getByText('<b>Texte</b>')).toBeOnTheScreen();
	});

	it('refreshes the list without replacing its existing releases', async () => {
		const onRefresh = jest.fn();
		await render(<ChangelogTimeline entries={[entry]} language="fr" refreshing onRefresh={onRefresh} />);
		await fireEvent(screen.getByTestId('changelog-timeline'), 'refresh');
		expect(onRefresh).toHaveBeenCalledTimes(1);
		expect(screen.getByText(entry.title_fr)).toBeOnTheScreen();
	});
});
