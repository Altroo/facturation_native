import type { ReactNode } from 'react';
import type { CompanyClass } from '@/models/classes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import StockDisabledState from './stockDisabledState';

type Props = {
	company_id: number;
	allowedRoles?: string[];
	requireStock?: boolean;
	requireInventory?: boolean;
	children: (args: { token: string; company: CompanyClass; role: string }) => ReactNode;
};

// Native routes replace the web session prop with the existing session context.
// Membership and company switches are checked before any child can fetch/write.
const StockFormWrapper = (props: Props) => {
	const token = useInitAccessToken();
	const memberships = useGetUserCompaniesQuery(undefined, { skip: !token });
	const membership = memberships.currentData?.find((item) => item.id === props.company_id);
	const company = useGetCompanyQuery({ id: props.company_id }, { skip: !token || !membership });
	if (!token || memberships.isLoading || memberships.isUninitialized) return <ApiProgress />;
	if (memberships.isError) return <QueryError error={memberships.error} onRetry={() => void memberships.refetch()} />;
	if (!membership || (props.allowedRoles && !props.allowedRoles.includes(membership.role))) return <NoPermission />;
	if (company.isError) return <QueryError error={company.error} onRetry={() => void company.refetch()} />;
	if (!company.currentData) return <ApiProgress />;
	if (props.requireStock !== false && !company.currentData.stock_management_enabled) return <StockDisabledState />;
	if (props.requireInventory && !company.currentData.inventory_management_enabled)
		return <StockDisabledState inventory />;
	return props.children({ token, company: company.currentData, role: membership.role });
};

export default StockFormWrapper;
