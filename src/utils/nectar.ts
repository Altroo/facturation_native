export const NECTAR_RAISON_SOCIALE = 'IMMOBILIERE NECTAR';

export const normalizeCompanyName = (value?: string | null) => (value ?? '').trim().toUpperCase();

export const isNectarRaisonSociale = (value?: string | null) => normalizeCompanyName(value) === NECTAR_RAISON_SOCIALE;
