import type { ReactNode } from 'react';
import NoPermission from '@/components/shared/noPermission/noPermission';
import { useAppSelector, usePermission } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';

type ProtectedProps = {
	children: ReactNode;
};

export const Protected = (props: ProtectedProps) => {
	const { is_staff } = usePermission();
	const profil = useAppSelector(getProfilState);
	// Wait for profile to load before evaluating permissions
	if (!profil.id) {
		return <ApiProgress />;
	}

	if (!is_staff) {
		return <NoPermission />;
	}

	return <>{props.children}</>;
};
