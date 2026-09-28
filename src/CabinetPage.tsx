import { useState } from 'react';
import { account, duration, formatPrice, type Plan } from './fixtures';

type Props = {
  plan: Plan; onBack: () => void;
  syncMessage: string; loading: boolean; connected: boolean; botReady: boolean;
  linkCommand: string | null; onLink: () => void; onRetry: () => void; onReset: () => void;
};

export function CabinetPage({ plan, onBack, syncMessage, loading, connected, botReady, linkCommand, onLink, onRetry, onReset }: Props) {
  const [blocked, setBlocked] = useState(false);
  return <main id="main-content" className="cabinet-page public-section">
    <span className="eyebrow">Управление доступом · только пример</span>
    <h1>Демо-кабинет</h1>
    <p>Здесь показан знакомый интерфейс без входа, списаний, реальных конфигураций и доступа к VPN.</p>
    <div className={'notice ' + (connected ? 'notice-success' : 'notice-warning')} role="status">
      {loading ? 'Подключаем отдельный демо-сервер…' : syncMessage || 'Демо-сервер запускается…'}
      {!connected && !loading && <button type="button" className="button button-secondary retry-button" onClick={onRetry}>Повторить</button>}
    </div>
    <div className="cabinet-grid">
      <section className="status-card" aria-labelledby="status-title">
        <span className="status-badge">{account.status}</span>
        <h2 id="status-title">{plan.name}</h2>
        <p>Срок: {duration(plan)} · {formatPrice(plan)} (только пример)</p>
        <p>Условное окончание: {account.illustrativeEndDate}</p>
        <p>Действующего VPN-доступа нет.</p>
        <button type="button" className="button" onClick={() => setBlocked(true)}>Подключить устройство</button>
      </section>
      <section className="history-card" aria-labelledby="history-title"><span className="eyebrow">История без списаний</span><h2 id="history-title">История для примера</h2>
        {account.history.map(item => <div className="history-row" key={item.label}><span>{item.label}</span><span>{item.units} ₽</span></div>)}
      </section>
    </div>
    {blocked && <div className="notice notice-warning" role="status">В демо нельзя оплатить подписку или подключить VPN.</div>}
    <section className="panel demo-conditions" aria-labelledby="conditions-title">
      <span className="eyebrow">Условия тарифа</span><h2 id="conditions-title">Лимиты без выдуманной телеметрии</h2>
      <dl className="details-list"><div><dt>Устройства</dt><dd>До {plan.deviceLimit}</dd></div><div><dt>Локации в полной версии</dt><dd>{plan.locations.join(' · ')}</dd></div><div><dt>Трафик</dt><dd>{plan.traffic}</dd></div></dl>
    </section>
    <section className="panel telegram-panel" aria-labelledby="link-title">
      <span className="eyebrow">Отдельный демо-бот</span><h2 id="link-title">Та же подписка в Telegram</h2>
      {botReady && connected ? <>
        <p>Создайте одноразовую команду и отправьте её только демо-боту. Действует 10 минут.</p>
        <button type="button" className="button button-secondary" onClick={onLink}>Создать код привязки</button>
        {linkCommand && <div className="link-command"><code>{linkCommand}</code><a href={`https://t.me/gitvpndemo_bot?start=${encodeURIComponent(linkCommand.slice(7))}`} target="_blank" rel="noopener noreferrer">Открыть демо-бота</a></div>}
      </> : <p>Telegram-бот пока не подключён. Сайт и просмотр тарифов работают без него.</p>}
    </section>
    <div className="cabinet-actions"><button type="button" className="button button-secondary" onClick={onBack}>Вернуться к тарифам</button>{connected && <button type="button" className="button button-secondary" onClick={onRetry}>Обновить статус</button>}<button type="button" className="button button-secondary" onClick={() => setBlocked(true)}>Продлить подписку</button>{connected && <button type="button" className="button button-secondary" onClick={onReset}>Сбросить демо-сеанс</button>}</div>
    <div className="notice notice-warning">Нет QR-кода, сервера или платёжной формы. Выбор тарифа показывает только предпросмотр.</div>
  </main>;
}
