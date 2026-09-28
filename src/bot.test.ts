import { expect, test } from 'vitest';
import { botReply, nextBotStep, type BotStep } from './bot';
import { plans } from './fixtures';

test('scripted bot has only finite safe local transitions', () => {
  expect(nextBotStep('idle', 'start')).toBe('menu');
  expect(nextBotStep('menu', 'plans')).toBe('plans');
  expect(botReply('plans')).toContain('Trial · Base · Base 6 · Base 12 · Family');
  expect(nextBotStep('plans', 'back')).toBe('menu');
  expect(nextBotStep('menu', 'status')).toBe('status');
  expect(botReply('status', plans[1])).toMatch(/Base.*предпросмотр.*доступа нет/);
  expect(botReply('status', plans[3])).toMatch(/Base 12.*предпросмотр.*доступа нет/);
  expect(botReply('status', plans[3])).not.toMatch(/undefined|условных ГБ/);
  expect(nextBotStep('status', 'help')).toBe('help');
  expect(nextBotStep('help', 'connect')).toBe('unavailable');
  expect(botReply('unavailable')).toBe('В демо оплата и VPN-доступ недоступны.');
  expect(nextBotStep('menu', 'invalid' as never)).toBe('menu');
  const replySteps: BotStep[] = ['plans', 'status', 'help', 'unavailable'];
  expect(replySteps.map(step => botReply(step)).join(' ')).not.toMatch(/https?:\/\/|t\.me|telegram\.org/);
});
