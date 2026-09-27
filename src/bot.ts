import { account, plans, type Plan } from './fixtures';

export type BotStep = 'idle' | 'menu' | 'plans' | 'status' | 'help' | 'unavailable';
export type BotAction = 'start' | 'plans' | 'status' | 'help' | 'back' | 'connect';

export function nextBotStep(step: BotStep, action: BotAction): BotStep {
  if (step === 'idle') return action === 'start' ? 'menu' : 'idle';
  if (action === 'back') return 'menu';
  if (action === 'connect') return 'unavailable';
  if (action === 'plans') return 'plans';
  if (action === 'status') return 'status';
  if (action === 'help') return 'help';
  return step;
}

export function botReply(step: BotStep, plan: Plan = plans[1]): string {
  switch (step) {
    case 'idle': return '';
    case 'menu': return 'Привет! Это вымышленное демо NoctVPN. Выберите пункт меню.';
    case 'plans': return `${plans.map(plan => plan.name).join(' · ')} — это вымышленные планы.`;
    case 'status': return `${plan.name}: ${account.status}. ${Math.min(account.usedGb, plan.quotaGb)} из ${plan.quotaGb} условных ГБ. Реального VPN-доступа нет.`;
    case 'help': return 'Здесь показаны только вымышленные ответы. Сообщения не отправляются в Telegram.';
    case 'unavailable': return 'В демо оплата и VPN-доступ недоступны.';
  }
}
