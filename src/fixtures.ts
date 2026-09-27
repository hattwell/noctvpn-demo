// Everything in this module is invented for the public portfolio demo.
export type Period = 1 | 3 | 12;
export type Plan = {
  id: 'lantern' | 'horizon' | 'orbit';
  name: string;
  description: string;
  unitsPerMonth: number;
  deviceCount: number;
  quotaGb: number;
};

export const periods: Period[] = [1, 3, 12];
export const plans: Plan[] = [
  { id: 'lantern', name: 'Фонарь', description: 'Для знакомства с интерфейсом.', unitsPerMonth: 120, deviceCount: 1, quotaGb: 30 },
  { id: 'horizon', name: 'Горизонт', description: 'Для нескольких вымышленных устройств.', unitsPerMonth: 210, deviceCount: 3, quotaGb: 100 },
  { id: 'orbit', name: 'Орбита', description: 'Для большого демо-сценария.', unitsPerMonth: 340, deviceCount: 5, quotaGb: 200 },
];

export const account = {
  demo: true as const,
  label: 'Демо-профиль',
  status: 'демо · активна',
  usedGb: 37,
  quotaGb: 100,
  illustrativeEndDate: '2030-12-31',
  history: [
    { label: 'Создана демо-подписка', units: 0 },
    { label: 'Период показан для примера', units: 0 },
  ],
};

export function totalUnits(plan: Plan, period: Period): number {
  return plan.unitsPerMonth * period;
}

export function validDemoData(candidatePlans: readonly Plan[], candidateAccount: typeof account): boolean {
  return candidatePlans.length === 3
    && new Set(candidatePlans.map(plan => plan.id)).size === 3
    && candidatePlans.every(plan => Boolean(plan.id && plan.name && plan.description)
      && Number.isFinite(plan.unitsPerMonth) && plan.unitsPerMonth > 0
      && Number.isInteger(plan.deviceCount) && plan.deviceCount > 0
      && Number.isInteger(plan.quotaGb) && plan.quotaGb > 0)
    && candidateAccount.demo === true
    && Boolean(candidateAccount.label && candidateAccount.status && candidateAccount.illustrativeEndDate)
    && Number.isInteger(candidateAccount.usedGb) && candidateAccount.usedGb >= 0
    && Number.isInteger(candidateAccount.quotaGb) && candidateAccount.quotaGb > 0
    && candidateAccount.history.length > 0
    && candidateAccount.history.every(item => Boolean(item.label) && item.units === 0);
}
