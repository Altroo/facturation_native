import { initToken } from '@/store/slices/_initSlice';
import reducer, { setGroupes, setProfil, setWSUserAvatar } from './accountSlice';
import { GroupClass, UserClass } from '@/models/classes';

describe('account slice', () => {
	const sampleUser = new UserClass(
		1,
		'John',
		'Doe',
		'john.doe@example.com',
		'male',
		'avatar-initial',
		null,
		false,
		true,
		false,
		'2024-01-01T00:00:00Z',
		'2024-06-01T00:00:00Z',
		'2024-06-01T00:00:00Z',
	);

	it('returns the initial state when given undefined state', () => {
		const state = reducer(undefined, { type: '@@INIT' });
		expect(state).toEqual({
			profil: {},
			groupes: [],
		});
	});

	it('setProfil stores the provided UserClass instance into profil', () => {
		const next = reducer(undefined, setProfil(sampleUser));
		expect(next.profil).toBe(sampleUser);
		expect((next.profil as UserClass).email).toBe('john.doe@example.com');
	});

	it('setGroupes sets groupes from GroupClass.group_titles', () => {
		const groups = new GroupClass(['admins', 'editors']);
		const next = reducer(undefined, setGroupes(groups));
		expect(next.groupes).toEqual(['admins', 'editors']);
	});

	it('setWSUserAvatar updates profil.avatar when profil is a UserClass', () => {
		const stateWithProfil = { profil: { ...sampleUser }, groupes: [] };
		const updated = reducer(stateWithProfil, setWSUserAvatar({ avatar: 'avatar-updated' }));
		expect((updated.profil as UserClass).avatar).toBe('avatar-updated');
	});

	it('setWSUserAvatar does not throw when profil is plain object and sets avatar property', () => {
		const plainState = { profil: {}, groupes: [] };
		const updated = reducer(plainState, setWSUserAvatar({ avatar: 'avatar-set' }));
		expect((updated.profil as Record<string, unknown>).avatar).toBe('avatar-set');
	});
});

const profile = new UserClass(
	7,
	'Test',
	'User',
	'test@example.invalid',
	'Homme',
	'avatar.png',
	null,
	true,
	true,
	false,
	'2026-01-01',
	null,
	null,
);

it('starts without a profile or roles until the session loads', () => {
	expect(reducer(undefined, { type: '@@INIT' })).toEqual({ profil: {}, groupes: [] });
});

it('replaces the complete profile without retaining permissions from the previous user', () => {
	const current = reducer(undefined, setProfil({ ...profile }));
	const replacement = { ...profile, id: 8, first_name: 'Other', is_staff: false, avatar: null };
	const next = reducer(current, setProfil(replacement));
	expect(next.profil).toEqual(replacement);
	expect(current.profil).toMatchObject({ id: 7, is_staff: true, avatar: 'avatar.png' });
});

it('reads group_titles and replaces rather than accumulates account roles', () => {
	const first = reducer(undefined, setGroupes({ group_titles: ['Caissier', 'Commercial'] }));
	const next = reducer(first, setGroupes({ group_titles: ['Lecture'] }));
	expect(next.groupes).toEqual(['Lecture']);
	expect(reducer(next, setGroupes({ group_titles: [] })).groupes).toEqual([]);
	expect(first.groupes).toEqual(['Caissier', 'Commercial']);
});

it('updates the profile and roles independently', () => {
	const current = reducer(reducer(undefined, setProfil({ ...profile })), setGroupes({ group_titles: ['Caissier'] }));
	expect(current.profil).toEqual(profile);
	expect(reducer(current, setProfil({ ...profile, first_name: 'Edited' })).groupes).toEqual(['Caissier']);
});

it('removes both personal data and roles on the shared session-reset action', () => {
	const current = reducer(reducer(undefined, setProfil({ ...profile })), setGroupes({ group_titles: ['Caissier'] }));
	expect(reducer(current, initToken())).toEqual({ profil: {}, groupes: [] });
	expect(current.profil?.id).toBe(7);
	expect(current.groupes).toEqual(['Caissier']);
});
