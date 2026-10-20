import type { UserCompaniesType } from '@/types/usersTypes';
import { View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ManagedByTableSection, { ManagedByTableSectionProps, ManagedByType } from './addManagedByTable';
import { translations } from '@/translations';
import { AddManagedBySectionProps } from '@/components/shared/addManagedBySection/addManagedBySection';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
const t = translations.fr;
const current: ManagedByType = {
	id: 1,
	first_name: 'Current',
	last_name: 'Admin',
	role: 'Caissier',
	can_validate_factures: true,
	can_change_document_status: true,
};
const other: ManagedByType = {
	id: 2,
	first_name: 'Sara',
	last_name: 'User',
	role: 'Commercial',
	can_validate_factures: false,
	can_change_document_status: false,
};
const onRoleChange = jest.fn();
const onInvoiceValidationChange = jest.fn();
const onDocumentStatusChangePermissionChange = jest.fn();
const onDelete = jest.fn();
const onAdd = jest.fn();
const setup = async (props: Partial<ManagedByTableSectionProps> = {}) =>
	await render(
		<ManagedByTableSection
			title="Gestionnaires"
			icon={null}
			emptyIcon={null}
			emptyMessage={t.companies.noManager}
			headers={['Nom', t.managedByTable.role]}
			data={[current, other]}
			isUserTable
			roleOptions={['Caissier', 'Commercial', 'Lecture'].map((role) => ({ code: role, value: role }))}
			onRoleChange={onRoleChange}
			onInvoiceValidationChange={onInvoiceValidationChange}
			onDocumentStatusChangePermissionChange={onDocumentStatusChangePermissionChange}
			onDelete={onDelete}
			showInvoiceValidationPermission
			showDocumentStatusChangePermission
			addSectionProps={{
				title: 'Ajouter',
				selectId: 'users',
				selectLabel: 'Gestionnaires',
				selectItems: [],
				selectValue: null,
				onSelectChange: jest.fn(),
				selectIcon: null,
				roleId: 'new-role',
				roleLabel: t.managedByTable.role,
				roleOptions: [],
				roleValue: '',
				onRoleChange: jest.fn(),
				roleIcon: null,
				onAdd,
				isAddDisabled: true,
			}}
			{...props}
		/>,
	);
beforeEach(() => jest.clearAllMocks());
it('reports the targeted row index through the original role, permission and deletion callbacks', async () => {
	await setup();
	await fireEvent.press(screen.getAllByRole('button', { name: t.managedByTable.role })[1]);
	await fireEvent.press(screen.getByRole('radio', { name: 'Lecture' }));
	expect(onRoleChange).toHaveBeenCalledWith(1, 'Lecture');
	await fireEvent(screen.getAllByRole('switch', { name: t.managedByTable.invoiceValidation })[1], 'valueChange', true);
	expect(onInvoiceValidationChange).toHaveBeenCalledWith(1, true);
	await fireEvent(
		screen.getAllByRole('switch', { name: t.managedByTable.documentStatusChange })[1],
		'valueChange',
		true,
	);
	expect(onDocumentStatusChangePermissionChange).toHaveBeenCalledWith(1, true);
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.delete })[1]);
	expect(onDelete).toHaveBeenCalledWith(1);
});
it('protects the current account while leaving other memberships editable', async () => {
	await setup({ currentUserId: 1 });
	expect(screen.getByText('Caissier')).toBeOnTheScreen();
	expect(screen.getAllByRole('switch')[0]).toBeDisabled();
	expect(screen.getAllByRole('switch')[1]).toBeDisabled();
	expect(screen.getAllByRole('button', { name: t.common.delete })).toHaveLength(2);
	expect(screen.getAllByRole('button', { name: t.common.delete })[0]).toBeDisabled();
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.delete })[1]);
	expect(onDelete).toHaveBeenCalledWith(1);
});
it('disables editing and adding while the parent mutation runs', async () => {
	await setup({ disabled: true });
	for (const input of screen.getAllByRole('switch')) expect(input).toBeDisabled();
	for (const button of screen.getAllByRole('button')) {
		expect(button).toBeDisabled();
		await fireEvent.press(button);
	}
	expect(onDelete).not.toHaveBeenCalled();
	expect(onAdd).not.toHaveBeenCalled();
});
it('supports original company data without treating its ID as the current account and hides optional permission fields', async () => {
	await setup({
		isUserTable: false,
		currentUserId: 1,
		data: [{ membership_id: 4, company_id: 1, raison_sociale: 'Atlas', role: 'Lecture' }],
		showInvoiceValidationPermission: false,
		showDocumentStatusChangePermission: false,
	});
	expect(screen.getByText('Atlas')).toBeOnTheScreen();
	expect(screen.queryByRole('switch')).toBeNull();
	expect(screen.getByRole('button', { name: t.common.delete })).not.toBeDisabled();
});
it('uses the caller supplied empty message and leaves addition disabled until the form validates its selection', async () => {
	await setup({ data: [], emptyMessage: 'Choisissez une entreprise' });
	expect(screen.getByText('Choisissez une entreprise')).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.common.add })).toBeDisabled();
});

describe('ManagedByTableSection', () => {
	const roleOptions = [
		{ value: 'Caissier', code: 'caissier' },
		{ value: 'Lecture', code: 'lecture' },
	];

	const addSectionProps: AddManagedBySectionProps = {
		title: 'Ajouter',
		selectId: 'user-select',
		selectLabel: 'Utilisateur',
		selectItems: [],
		selectValue: null,
		onSelectChange: jest.fn(),
		selectIcon: <View />,
		roleId: 'role-select',
		roleLabel: 'Rôle',
		roleOptions,
		roleValue: 'Caissier',
		onRoleChange: jest.fn(),
		roleIcon: <View />,
		onAdd: jest.fn(),
		isAddDisabled: false,
	};

	it('renders empty state when data is empty', async () => {
		await render(
			<ManagedByTableSection
				title="Gestionnaires"
				icon={<View testID="icon" />}
				emptyIcon={<View testID="empty-icon" />}
				emptyMessage="Aucun gestionnaire"
				headers={['Nom', 'Rôle']}
				data={[]}
				isUserTable={true}
				roleOptions={roleOptions}
				onRoleChange={jest.fn()}
				onDelete={jest.fn()}
				addSectionProps={addSectionProps}
			/>,
		);

		expect(screen.getByText('Aucun gestionnaire')).toBeOnTheScreen();
		expect(screen.getByTestId('empty-icon')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: 'Ajouter' })).toBeOnTheScreen();
	});

	it('renders user table with chip for current user and handles role change and delete', async () => {
		const onRoleChange = jest.fn();
		const onDelete = jest.fn();

		const userData: ManagedByType[] = [
			{ id: 1, first_name: 'Alice', last_name: 'Smith', role: 'Caissier' },
			{ id: 2, first_name: 'Bob', last_name: 'Jones', role: 'Lecture' },
		];

		await render(
			<ManagedByTableSection
				title="Gestionnaires"
				icon={<View testID="icon" />}
				emptyIcon={<View />}
				emptyMessage="Aucun gestionnaire"
				headers={['Nom', 'Rôle']}
				data={userData}
				isUserTable={true}
				currentUserId={1}
				roleOptions={roleOptions}
				onRoleChange={onRoleChange}
				onDelete={onDelete}
				addSectionProps={addSectionProps}
			/>,
		);

		expect(screen.getByText('Alice Smith')).toBeOnTheScreen();
		expect(screen.getByText('Bob Jones')).toBeOnTheScreen();
		expect(screen.getByText('vous')).toBeOnTheScreen();

		await fireEvent.press(screen.getAllByRole('button', { name: 'Rôle' })[1]);
		await fireEvent.press(screen.getByRole('radio', { name: 'Caissier' }));
		expect(onRoleChange).toHaveBeenCalledWith(1, 'Caissier');

		const deleteButtons = screen.getAllByRole('button', { name: translations.fr.common.delete });
		await fireEvent.press(deleteButtons[1]); // Click Bob's delete button
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	it('renders company table and disables nothing', async () => {
		const companyData: UserCompaniesType[] = [
			{
				membership_id: 10,
				company_id: 100,
				raison_sociale: 'Acme Corp',
				role: 'Lecture',
			},
		];

		await render(
			<ManagedByTableSection
				title="Entreprises"
				icon={<View testID="icon" />}
				emptyIcon={<View />}
				emptyMessage="Aucune entreprise"
				headers={['Entreprise', 'Rôle']}
				data={companyData}
				isUserTable={false}
				roleOptions={roleOptions}
				onRoleChange={jest.fn()}
				onDelete={jest.fn()}
				addSectionProps={addSectionProps}
			/>,
		);

		expect(screen.getByText('Acme Corp')).toBeOnTheScreen();
		expect(screen.getAllByRole('button', { name: 'Rôle' })[0]).not.toBeDisabled();
	});
});
