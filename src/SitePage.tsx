import { useState } from 'react';
import { duration, formatPrice, plans, type Plan } from './fixtures';

type Props = { selected: Plan; onPlan: (plan: Plan) => void; onCabinet: () => void };

export function SitePage({ selected, onPlan, onCabinet }: Props) {
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [trialNotice, setTrialNotice] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  return <main id="main-content">
    <section className="hero public-section">
      <div className="hero-copy">
        <span className="eyebrow">Спокойное подключение без лишних настроек</span>
        <h1>VPN, который понятно подключать и легко продлевать</h1>
        <p>Одна подписка для телефона, компьютера и ТВ. Выбирайте доступную локацию, подключайте приложение по ссылке и управляйте сроком в личном кабинете.</p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={onCabinet}>Посмотреть подключение</button>
          <button type="button" className="button button-secondary" onClick={() => document.getElementById('benefits-title')?.scrollIntoView({ behavior: 'smooth' })}>Как это работает</button>
        </div>
        <p className="quiet-note">Сейчас вы смотрите демонстрацию: ключи и подписки здесь не выдаются.</p>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="signal-core">N</div>
        <span className="node node-one">FI</span><span className="node node-two">SE</span><span className="node node-three">FR</span>
      </div>
    </section>
    <section className="public-section features" aria-labelledby="benefits-title">
      <div className="section-heading"><span className="eyebrow">Главное на виду</span><h2 id="benefits-title">Не техническая панель, а понятный сервис</h2></div>
      <div className="feature-grid">
        <article><span>01</span><h3>Быстрое подключение</h3><p>Ссылка, локальный QR и инструкции для популярных устройств — в полной версии.</p></article>
        <article><span>02</span><h3>Честный статус</h3><p>Тариф и дата окончания без выдуманного счётчика устройств. Здесь статус условный.</p></article>
        <article><span>03</span><h3>Поддержка рядом</h3><p>Инструкции доступны для знакомства; обращения в поддержку из демо не отправляются.</p></article>
      </div>
    </section>
    <section className="public-section pricing" id="plans" aria-labelledby="plans-title">
      <div className="section-heading"><span className="eyebrow">Тарифы</span><h2 id="plans-title">Выберите срок и лимит устройств</h2><p>Снимок публичного каталога для ознакомления, не действующая оферта. В демо ни один тариф нельзя получить или оплатить.</p></div>
      <div className="pricing-grid" aria-label="Тарифы на демонстрационном экране">
        {plans.map(plan => {
          const trial = plan.code === 'trial';
          return <article className={'price-card' + (plan.code === 'base_12' ? ' featured' : '')} key={plan.code}>
            <span className="plan-duration">{duration(plan)}</span>
            <h3>{plan.name}</h3><strong>{formatPrice(plan)}</strong>
            <ul><li>До {plan.deviceLimit} устройств</li><li>{plan.locations.join(' · ')}</li><li>{plan.traffic}</li></ul>
            <button type="button" className="button button-secondary" onClick={() => {
              if (trial) { setTrialNotice(true); return; }
              onPlan(plan); setPreviewCode(plan.code); setUnavailable(false); setTrialNotice(false);
            }}>{trial ? 'Получить Trial' : `Купить ${plan.name}`}</button>
            {trial && trialNotice && <div className="notice notice-warning" role="status">В демо Trial не выдаётся.</div>}
            {previewCode === plan.code && !trial && <div className="purchase-preview" role="region" aria-label={`Оформление тарифа ${plan.name}`}>
              <p><b>Тариф:</b> {plan.name}, {duration(plan)}</p>
              <p><b>К оплате:</b> {formatPrice(plan)} · только для просмотра</p>
              <button className="button button-block" onClick={() => setUnavailable(true)} type="button">Оплатить</button>
              {unavailable && <div className="notice notice-warning" role="status">В демо нельзя оплатить подписку или подключить VPN.</div>}
              <p className="purchase-consent">Платёжные данные не запрашиваются. В кабинете появится только предпросмотр выбранного тарифа.</p>
            </div>}
          </article>;
        })}
      </div>
      <div className="pricing-footer"><p>Выбран для предпросмотра: <strong>{selected.name}</strong>. Оплата и VPN не работают.</p><button type="button" className="button" onClick={onCabinet}>Открыть демо-кабинет</button></div>
    </section>
  </main>;
}
