// Public display snapshot manually transcribed from the visitor-facing catalog.
// These numbers are NOT an offer; this demo has no payment or provisioning path.
import catalog from '../demo_catalog.json';

export type Plan = {
  code: string;
  name: string;
  rubPrice: number;
  durationMonths: number | null;
  durationDays: number | null;
  deviceLimit: number;
  locations: string[];
  traffic: string;
  description: string;
};

export const plans: Plan[] = catalog;

export const account = {
  demo: true as const,
  label: 'Демо-профиль',
  status: 'демо · предпросмотр',
  illustrativeEndDate: '2030-12-31',
  history: [
    { label: 'Просмотрен тариф', units: 0 },
    { label: 'Создан пример кабинета', units: 0 },
  ],
};

export function formatPrice(plan: Plan): string {
  return new Intl.NumberFormat('ru-RU').format(plan.rubPrice) + ' ₽';
}

export function duration(plan: Plan): string {
  if (plan.durationDays) return `${plan.durationDays} дней`;
  if (plan.durationMonths === 1) return '1 месяц';
  return `${plan.durationMonths} месяцев`;
}

export function validDemoData(candidatePlans: readonly Plan[], candidateAccount: typeof account): boolean {
  return candidatePlans.length === 5
    && new Set(candidatePlans.map(plan => plan.code)).size === 5
    && candidatePlans.every(plan => Boolean(plan.code && plan.name && plan.description)
      && Number.isInteger(plan.rubPrice) && plan.rubPrice >= 0
      && Number.isInteger(plan.deviceLimit) && plan.deviceLimit > 0
      && plan.locations.length > 0)
    && candidateAccount.demo === true
    && Boolean(candidateAccount.label && candidateAccount.status)
    && candidateAccount.history.length > 0
    && candidateAccount.history.every(item => Boolean(item.label) && item.units === 0);
}
