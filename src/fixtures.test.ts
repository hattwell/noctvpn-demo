import { expect, test } from 'vitest';
import { account, plans, totalUnits, validDemoData } from './fixtures';

test('all demo data is invented and locally priced', () => {
  expect(plans).toHaveLength(3);
  expect(plans.map(plan => plan.id)).toEqual(['lantern', 'horizon', 'orbit']);
  expect(account.demo).toBe(true);
  expect(account.history).toHaveLength(2);
  expect(account.history.every(item => item.units === 0)).toBe(true);
  expect(totalUnits(plans[1], 3)).toBe(630);
  expect(validDemoData(plans, account)).toBe(true);
});

test('invalid or missing demo records trigger a safe local fallback', () => {
  expect(validDemoData([], account)).toBe(false);
  expect(validDemoData([{ ...plans[0], unitsPerMonth: NaN }], account)).toBe(false);
  expect(validDemoData(plans, { ...account, history: [{ label: '', units: 0 }] })).toBe(false);
});
