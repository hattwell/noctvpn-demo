import { periods, plans, totalUnits, type Period, type Plan } from './fixtures';

type Props = {
  selected: Plan;
  period: Period;
  onPlan: (plan: Plan) => void;
  onPeriod: (period: Period) => void;
  onCabinet: () => void;
};

export function SitePage({ selected, period, onPlan, onPeriod, onCabinet }: Props) {
  return <main id="main-content">
    <section className="hero public-section">
      <div className="hero-copy">
        <span className="eyebrow">Спокойное знакомство с интерфейсом</span>
        <h1>VPN, который понятно подключать и легко продлевать</h1>
        <p>Так выглядит NoctVPN: выбирайте вымышленный план и посмотрите пример кабинета. Здесь ничего нельзя купить или подключить.</p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>Посмотреть тарифы</button>
          <button type="button" className="button button-secondary" onClick={onCabinet}>Демо-кабинет</button>
        </div>
        <p className="quiet-note">Рабочий VPN и настоящий Telegram-бот в этом демо недоступны.</p>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="signal-core">N</div>
        <span className="node node-one">01</span><span className="node node-two">02</span><span className="node node-three">03</span>
      </div>
    </section>
    <section className="public-section features" aria-labelledby="benefits-title">
      <div className="section-heading"><span className="eyebrow">Главное на виду</span><h2 id="benefits-title">Знакомство с сервисом без доступа к сети</h2></div>
      <div className="feature-grid">
        <article><span>01</span><h3>Понятный выбор</h3><p>Тарифы и условные периоды — все значения придуманы для демо.</p></article>
        <article><span>02</span><h3>Пример кабинета</h3><p>Фиктивный статус и история без реальных людей и списаний.</p></article>
        <article><span>03</span><h3>Бот как сценарий</h3><p>Посмотрите диалог прямо на сайте: сообщения никуда не отправятся.</p></article>
      </div>
    </section>
    <section className="public-section pricing" id="plans" aria-labelledby="plans-title">
      <div className="section-heading"><span className="eyebrow">Демо-тарифы</span><h2 id="plans-title">Выберите пример тарифа</h2><p>Условные единицы — это не цена услуги. Доступ к VPN не предоставляется.</p></div>
      <div className="pricing-grid" aria-label="Вымышленные планы">
        {plans.map(plan => <article className={'price-card' + (plan.id === selected.id ? ' featured' : '')} key={plan.id}>
          <span className="plan-duration">Демо · {plan.deviceCount} {plan.deviceCount === 1 ? 'устройство' : 'устройств'}</span>
          <h3>{plan.name}</h3><p>{plan.description}</p><strong>{plan.unitsPerMonth} <span>демо-ед. / месяц</span></strong>
          <ul><li>{plan.quotaGb} условных ГБ</li><li>{plan.deviceCount} демо-устройств</li></ul>
          <button type="button" className={'button ' + (plan.id === selected.id ? '' : 'button-secondary')} aria-pressed={plan.id === selected.id} onClick={() => onPlan(plan)}>Выбрать {plan.name}</button>
        </article>)}
      </div>
      <div className="period-selection"><div><h3>Период примера</h3><div className="periods">{periods.map(months => <button type="button" key={months} className={'button ' + (months === period ? '' : 'button-secondary')} aria-pressed={months === period} onClick={() => onPeriod(months)}>{months} {months === 1 ? 'месяц' : months === 3 ? 'месяца' : 'месяцев'}</button>)}</div></div>
        <div className="total"><span>Условный итог</span><strong>{totalUnits(selected, period)} демо-ед.</strong><button type="button" className="button" onClick={onCabinet}>Открыть демо-кабинет</button></div>
      </div>
    </section>
  </main>;
}
