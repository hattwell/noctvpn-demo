import { account, totalUnits, type Period, type Plan } from './fixtures';

type Props = { plan: Plan; period: Period; onBack: () => void };

export function CabinetPage({ plan, period, onBack }: Props) {
  const used = Math.min(account.usedGb, plan.quotaGb);
  return <main id="main-content" className="cabinet-page public-section">
    <span className="eyebrow">Только вымышленные данные</span>
    <h1>Демо-кабинет</h1>
    <p>Это пример интерфейса — без входа, списаний, конфигураций и доступа к VPN.</p>
    <div className="cabinet-grid">
      <section className="status-card" aria-labelledby="status-title">
        <div><span className="status-badge">{account.status}</span><h2 id="status-title">{plan.name}</h2>
          <p>Период: {period} {period === 1 ? 'месяц' : period === 3 ? 'месяца' : 'месяцев'} · {totalUnits(plan, period)} демо-ед.</p>
          <p>Условное окончание: {account.illustrativeEndDate}</p>
          <p>{used} из {plan.quotaGb} условных ГБ</p>
          <progress value={used} max={plan.quotaGb} aria-label="Пример использования" />
        </div>
      </section>
      <section className="history-card" aria-labelledby="history-title"><span className="eyebrow">Без списаний</span><h2 id="history-title">История для примера</h2>
        {account.history.map(item => <div className="history-row" key={item.label}><span>{item.label}</span><span>{item.units} демо-ед.</span></div>)}
      </section>
    </div>
    <div className="notice notice-warning">VPN-настройка недоступна в демо. Здесь нет QR-кода, сервера или платёжной формы.</div>
    <button type="button" className="button button-secondary" onClick={onBack}>Вернуться к тарифам</button>
  </main>;
}
