import { useState } from 'react';
import { BotPage } from './BotPage';
import { CabinetPage } from './CabinetPage';
import { SitePage } from './SitePage';
import { account, plans, validDemoData, type Period, type Plan } from './fixtures';

type Mode = 'site' | 'cabinet' | 'bot';

export default function App() {
  const [mode, setMode] = useState<Mode>('site');
  const [selected, setSelected] = useState<Plan>(plans[1]);
  const [period, setPeriod] = useState<Period>(1);
  const show = (next: Mode, focus?: 'plans') => {
    setMode(next);
    requestAnimationFrame(() => {
      if (focus) document.getElementById(focus)?.scrollIntoView({ behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  return <div className="public-shell">
    <a className="skip-link" href="#main-content">К содержимому</a>
    <header className="public-header">
      <span className="brand" aria-label="Noct VPN — демо">NOCT<span>VPN</span></span>
      <nav aria-label="Разделы публичного демо">
        <button type="button" aria-current={mode === 'site' ? 'page' : undefined} onClick={() => show('site')}>Сайт</button>
        <button type="button" aria-current={mode === 'cabinet' ? 'page' : undefined} onClick={() => show('cabinet')}>Демо-кабинет</button>
        <button type="button" aria-current={mode === 'bot' ? 'page' : undefined} onClick={() => show('bot')}>Бот · симуляция</button>
      </nav>
      <span className="demo-marker">Демо</span>
    </header>
    <div className="demo-notice">Публичное демо · вымышленные данные · без оплаты и VPN-подключения</div>
    {!validDemoData(plans, account) ? <main id="main-content" className="public-section"><h1>Демо временно недоступно</h1><p>Данные примера не загрузились. Попробуйте обновить страницу позже.</p></main>
      : mode === 'site' ? <SitePage selected={selected} period={period} onPlan={setSelected} onPeriod={setPeriod} onCabinet={() => show('cabinet')} />
      : mode === 'cabinet' ? <CabinetPage plan={selected} period={period} onBack={() => show('site', 'plans')} /> : <BotPage plan={selected} />}
    <footer className="public-footer"><span>NOCT VPN · только демонстрация интерфейса</span><span>Данные вымышлены, доступ не предоставляется</span></footer>
  </div>;
}
