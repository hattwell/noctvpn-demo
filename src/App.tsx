import { useCallback, useEffect, useRef, useState } from 'react';
import { BotPage } from './BotPage';
import { CabinetPage } from './CabinetPage';
import { SitePage } from './SitePage';
import { account, plans, validDemoData, type Plan } from './fixtures';
import { beginDemo, getDemo, getDemoHealth, linkDemo, resetDemo, selectDemoPlan, SESSION_KEY, type DemoSession } from './demoClient';

type Mode = 'site' | 'cabinet' | 'bot';

export default function App() {
  const [mode, setMode] = useState<Mode>('site');
  const [selected, setSelected] = useState<Plan>(plans[1]);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [message, setMessage] = useState('');
  const [botReady, setBotReady] = useState(false);
  const [linkCommand, setLinkCommand] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingPlan = useRef<string | null>(null);

  const synchronize = useCallback(async () => {
    setLoading(true);
    try {
      let state = await beginDemo(window.localStorage);
      if (pendingPlan.current) {
        state = await selectDemoPlan(window.localStorage, pendingPlan.current);
        pendingPlan.current = null;
      }
      setSession(state);
      setSelected(plans.find(plan => plan.code === state.planCode) ?? plans[1]);
      setMessage('Демо-сеанс синхронизирован');
      try { setBotReady((await getDemoHealth()).botReady); }
      catch { setBotReady(false); }
    } catch (error) {
      setSession(null);
      setBotReady(false);
      setMessage(error instanceof Error ? error.message : 'Демо-сервер недоступен.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mode === 'cabinet') void synchronize(); }, [mode, synchronize]);
  useEffect(() => {
    if (mode !== 'cabinet' || !session) return;
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void getDemo(window.localStorage).then(state => {
        setSession(state);
        setSelected(plans.find(plan => plan.code === state.planCode) ?? plans[1]);
      }).catch(error => {
        setSession(null);
        setBotReady(false);
        setMessage(error instanceof Error ? error.message : 'Демо-сервер недоступен.');
      });
    }, 7000);
    return () => window.clearInterval(poll);
  }, [mode, Boolean(session)]);

  const choosePlan = (plan: Plan) => {
    setSelected(plan);
    pendingPlan.current = plan.code;
    if (window.localStorage.getItem(SESSION_KEY)) {
      void selectDemoPlan(window.localStorage, plan.code).then(state => {
        setSession(state);
        if (pendingPlan.current === plan.code) pendingPlan.current = null;
      }).catch(error => setMessage(error instanceof Error ? error.message : 'Демо-сервер недоступен.'));
    }
  };

  const showLink = async () => {
    try { setLinkCommand((await linkDemo(window.localStorage)).command); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Привязка временно недоступна.'); }
  };

  const clearSession = async () => {
    try {
      await resetDemo(window.localStorage);
      setSession(null); setSelected(plans[1]); setLinkCommand(null);
      setMessage('Демо-сеанс сброшен. При повторе будет создан новый.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Сброс временно недоступен.'); }
  };

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
      : mode === 'site' ? <SitePage selected={selected} onPlan={choosePlan} onCabinet={() => show('cabinet')} />
      : mode === 'cabinet' ? <CabinetPage plan={selected} onBack={() => show('site', 'plans')} syncMessage={message} loading={loading} connected={Boolean(session)} botReady={botReady} linkCommand={linkCommand} onLink={() => void showLink()} onRetry={() => void synchronize()} onReset={() => void clearSession()} /> : <BotPage plan={selected} />}
    <footer className="public-footer"><span>NOCT VPN · только демонстрация интерфейса</span><span>Данные вымышлены, доступ не предоставляется</span></footer>
  </div>;
}
