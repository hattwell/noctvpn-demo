import { expect, test } from 'vitest';
import { account, duration, formatPrice, plans, validDemoData } from './fixtures';

test('display catalog matches the original public plan snapshot without secret access', () => {
  expect(plans.map(plan => plan.code)).toEqual(['trial', 'base_1', 'base_6', 'base_12', 'family_1']);
  expect(plans.map(plan => plan.rubPrice)).toEqual([0, 199, 799, 1299, 399]);
  expect(plans.map(plan => plan.deviceLimit)).toEqual([2, 5, 5, 5, 15]);
  expect(plans[0].locations).toEqual(['Стокгольм']);
  expect(plans[3].locations).toEqual(['Хельсинки', 'Стокгольм', 'Париж']);
  expect(duration(plans[0])).toBe('7 дней');
  expect(duration(plans[1])).toBe('1 месяц');
  expect(duration(plans[3])).toBe('12 месяцев');
  expect(formatPrice(plans[3])).toBe('1 299 ₽');
  expect(account.demo).toBe(true);
  expect(validDemoData(plans, account)).toBe(true);
});

test('invalid display records fail closed instead of showing a purchased plan', () => {
  expect(validDemoData([], account)).toBe(false);
  expect(validDemoData([{ ...plans[0], rubPrice: NaN }], account)).toBe(false);
  expect(validDemoData(plans, { ...account, history: [] })).toBe(false);
});
