import { useState } from 'react';
import { botReply, nextBotStep, type BotAction, type BotStep } from './bot';
import type { Plan } from './fixtures';

type Line = { role: 'visitor' | 'scenario'; text: string };
const choices: Record<BotStep, { label: string; action: BotAction }[]> = {
  idle: [{ label: '/start', action: 'start' }],
  menu: [
    { label: 'Тарифы', action: 'plans' }, { label: 'Моя подписка', action: 'status' },
    { label: 'Помощь', action: 'help' }, { label: 'Попробовать подключить', action: 'connect' },
  ],
  plans: [{ label: 'Назад', action: 'back' }, { label: 'Попробовать подключить', action: 'connect' }],
  status: [{ label: 'Назад', action: 'back' }, { label: 'Помощь', action: 'help' }],
  help: [{ label: 'Назад', action: 'back' }, { label: 'Попробовать подключить', action: 'connect' }],
  unavailable: [{ label: 'Назад', action: 'back' }],
};

export function BotPage({ plan }: { plan: Plan }) {
  const [step, setStep] = useState<BotStep>('idle');
  const [lines, setLines] = useState<Line[]>([]);

  const choose = (action: BotAction, label: string) => {
    const next = nextBotStep(step, action);
    if (next === step) return;
    setLines(previous => [...previous, { role: 'visitor', text: label }, { role: 'scenario', text: botReply(next, plan) }]);
    setStep(next);
  };

  return <main id="main-content" className="public-section bot-page">
    <span className="eyebrow">Бот внутри демо-сайта</span><h1>Как выглядит диалог</h1>
    <p>Попробуйте короткий сценарий на вымышленных данных. Настоящий бот не получает сообщений.</p>
    <section className="bot-frame" aria-label="Сценарная симуляция бота">
      <div className="bot-header"><span className="bot-avatar" aria-hidden="true">N</span><div><strong>NOCT VPN · сценарий</strong><small>Сообщения не отправляются в Telegram</small></div></div>
      <div className="bot-transcript" role="log" aria-live="polite" aria-relevant="additions text">
        {lines.length === 0 ? <div className="bot-empty">Нажмите /start, чтобы открыть вымышленное меню.</div> :
          lines.map((line, index) => <div key={index} className={'bot-bubble ' + (line.role === 'visitor' ? 'from-visitor' : 'from-scenario')}>{line.text}</div>)}
      </div>
      <div className="bot-choices" aria-label="Кнопки сценария">
        {choices[step].map(choice => <button type="button" className="button button-secondary" key={choice.label} onClick={() => choose(choice.action, choice.label)}>{choice.label}</button>)}
      </div>
    </section>
    <p className="quiet-note bot-disclaimer">Симуляция не подключается к Telegram, VPN или платёжным сервисам.</p>
  </main>;
}
