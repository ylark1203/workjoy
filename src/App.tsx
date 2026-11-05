import { useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AppPage, AppSettings, CloseBehavior, MiniContentKey, SalarySettings } from './types/models';
import { defaultSettings, miniContentOptions } from './types/models';
import { loadSettings, saveSettings } from './services/storageService';
import { getPaydayCountdown, getWeekendCountdown, getWorkState, formatDuration } from './services/timeService';
import { formatMoney, getSalarySnapshot } from './services/salaryService';
import { chooseTextFile, hideMainWindow, hideMiniMenu, notify, openMainWindow, quitApp, resizeMiniWindow, setAutostart, setGlobalShortcut, setMiniClickThrough, showMiniMenu, showMiniWindow, toggleWindow } from './services/desktopService';

type Setter = (next: AppSettings | ((current: AppSettings) => AppSettings)) => void;

function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [page, setPage] = useState<AppPage>('dashboard');
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [windowLabel] = useState(() => {
    if (!('__TAURI_INTERNALS__' in window)) return 'main';
    return getCurrentWindow().label;
  });
  const startInMiniMode = useRef<boolean | null>(null);

  const performClose = async (behavior: Exclude<CloseBehavior, 'ask'>, remember = false) => {
    const nextSettings = remember ? { ...settings, closeBehavior: behavior } : settings;
    if (remember) {
      setSettings(nextSettings);
      await saveSettings(nextSettings);
    }
    setClosePromptOpen(false);
    if (behavior === 'minimize') await hideMainWindow();
    else if (behavior === 'minimal') { await showMiniWindow(); await hideMainWindow(); }
    else await quitApp();
  };

  useEffect(() => {
    void loadSettings()
      .then((value) => setSettings(value))
      .catch(() => setSettings(structuredClone(defaultSettings)))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!loaded) return; const timer = window.setTimeout(() => { void saveSettings(settings); }, 250); return () => window.clearTimeout(timer); }, [settings, loaded]);
  useEffect(() => {
    if (!loaded || windowLabel !== 'main') return;
    const reminders = [
      { enabled: settings.reminders.waterEnabled, minutes: settings.reminders.waterIntervalMinutes, title: '喝水提醒', body: '该喝水啦，给身体一点空间。' },
      { enabled: settings.reminders.sittingEnabled, minutes: settings.reminders.sittingIntervalMinutes, title: '久坐提醒', body: '站起来走两步，肩颈也需要呼吸。' },
      { enabled: settings.reminders.eyeEnabled, minutes: settings.reminders.eyeIntervalMinutes, title: '眼睛休息', body: '让眼睛离开屏幕，看看远处 20 秒。' }
    ];
    const timers = reminders.filter((reminder) => reminder.enabled && reminder.minutes > 0).map((reminder) => window.setInterval(() => void notify(reminder.title, reminder.body), reminder.minutes * 60_000));
    return () => timers.forEach((timer) => window.clearInterval(timer));
  }, [loaded, settings.reminders, windowLabel]);
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window) || windowLabel !== 'main') return;
    let unlisten: (() => void) | undefined;
    void listen<string>('tray-navigate', (event) => {
      if (event.payload === 'dashboard' || event.payload === 'focus' || event.payload === 'reader' || event.payload === 'settings') setPage(event.payload);
    }).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, [windowLabel]);
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window) || windowLabel !== 'main') return;
    let unlisten: (() => void) | undefined;
    void listen('close-requested', () => {
      if (settings.closeBehavior === 'ask') setClosePromptOpen(true);
      else void performClose(settings.closeBehavior);
    }).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, [settings.closeBehavior, windowLabel]);
  useEffect(() => {
    if (!loaded || windowLabel !== 'main') return;
    void setMiniClickThrough(settings.miniMode.clickThrough).catch(() => undefined);
  }, [loaded, windowLabel]);
  useEffect(() => {
    if (!loaded || windowLabel !== 'main' || startInMiniMode.current !== null) return;
    startInMiniMode.current = settings.startInMiniMode;
    if (settings.startInMiniMode) void showMiniWindow().then(hideMainWindow).catch(() => undefined);
  }, [loaded, settings.startInMiniMode, windowLabel]);
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    let unlisten: (() => void) | undefined;
    void listen<boolean>('mini-click-through-changed', (event) => {
      setSettings((current) => current.miniMode.clickThrough === event.payload ? current : { ...current, miniMode: { ...current.miniMode, clickThrough: event.payload } });
    }).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, []);
  useEffect(() => {
    if (!loaded || !('__TAURI_INTERNALS__' in window)) return;
    let unlisten: (() => void) | undefined;
    void listen<AppSettings['miniMode']>('mini-mode-updated', (event) => {
      setSettings((current) => miniModeEqual(current.miniMode, event.payload) ? current : { ...current, miniMode: event.payload });
    }).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, [loaded]);
  useEffect(() => {
    if (!loaded || windowLabel !== 'main' || !('__TAURI_INTERNALS__' in window)) return;
    // Keep both auxiliary windows in sync when settings are changed in the main window.
    void Promise.all([
      emitTo('mini', 'mini-mode-updated', settings.miniMode),
      emitTo('mini-menu', 'mini-mode-updated', settings.miniMode)
    ]).catch(() => undefined);
  }, [loaded, settings.miniMode, windowLabel]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme;
  }, [settings.theme]);
  useEffect(() => { if (windowLabel === 'main') void setGlobalShortcut(settings.globalShortcut, () => void toggleWindow()); }, [settings.globalShortcut, windowLabel]);
  useEffect(() => { if (windowLabel === 'main') void setAutostart(settings.launchAtStartup); }, [settings.launchAtStartup, windowLabel]);

  const update: Setter = (next) => setSettings((current) => typeof next === 'function' ? next(current) : next);
  if (!loaded) return <div className="loading-screen"><div className="brand-mark">W</div><p>正在准备你的工位能量…</p></div>;
  if (windowLabel === 'mini') return <MiniWindow settings={settings} update={update} now={now} />;
  if (windowLabel === 'mini-menu') return <MiniMenuWindow settings={settings} update={update} />;
  if (!settings.configured) return <SetupWizard settings={settings} update={update} />;

  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} onHide={() => void toggleWindow()} />
    <main className="main-content">
      <header className="topbar">
        <div><span className="eyebrow">WORKJOY / 工位能量站</span><h1>{page === 'dashboard' ? greeting(now) : page === 'focus' ? '专注一下' : page === 'reader' ? '低干扰阅读' : '设置'}</h1></div>
        <div className="topbar-actions"><span className="date-label">{now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span><button className="icon-button" title="隐藏到托盘" onClick={() => void toggleWindow()}>−</button></div>
      </header>
      {page === 'dashboard' && <Dashboard now={now} settings={settings} setPage={setPage} />}
      {page === 'focus' && <FocusPage settings={settings} update={update} />}
      {page === 'reader' && <ReaderPage settings={settings} update={update} />}
      {page === 'settings' && <SettingsPage settings={settings} update={update} />}
    </main>
    {closePromptOpen && <ClosePrompt onCancel={() => setClosePromptOpen(false)} onClose={(behavior, remember) => void performClose(behavior, remember)} />}
  </div>;
}

function greeting(now: Date): string {
  const hour = now.getHours();
  return hour < 11 ? '早上好 👋' : hour < 14 ? '中午好 👋' : hour < 18 ? '下午好 👋' : '晚上好 👋';
}

function ClosePrompt({ onCancel, onClose }: { onCancel: () => void; onClose: (behavior: Exclude<CloseBehavior, 'ask'>, remember: boolean) => void }) {
  const [remember, setRemember] = useState(false);
  const [selectedBehavior, setSelectedBehavior] = useState<Exclude<CloseBehavior, 'ask'>>('minimize');
  return <div className="close-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="close-dialog" role="dialog" aria-modal="true" aria-labelledby="close-dialog-title">
      <button className="dialog-close" aria-label="取消关闭" onClick={onCancel}>×</button>
      <span className="card-kicker">WORKJOY / CLOSE</span>
      <h2 id="close-dialog-title">要怎么处理 WorkJoy？</h2>
      <p>你可以把它收进任务栏，稍后随时回来；也可以完全退出程序。</p>
      <div className="close-actions">
        <button className={`close-choice ${selectedBehavior === 'minimize' ? 'selected' : ''}`} onClick={() => setSelectedBehavior('minimize')}>最小化到任务栏 <span>↓</span></button>
        <button className={`close-choice ${selectedBehavior === 'exit' ? 'selected' : ''}`} onClick={() => setSelectedBehavior('exit')}>关闭程序 <span>×</span></button>
        <button className={`close-choice ${selectedBehavior === 'minimal' ? 'selected' : ''}`} onClick={() => setSelectedBehavior('minimal')}>极简模式 <span>·</span></button>
      </div>
      <label className="remember-close"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />下次不再提示</label>
      <div className="dialog-footer"><button className="text-button" onClick={onCancel}>取消</button><button className="primary-button confirm-button" onClick={() => onClose(selectedBehavior, remember)}>确定 <span>→</span></button></div>
    </section>
  </div>;
}

function MiniWindow({ settings, update, now }: { settings: AppSettings; update: Setter; now: Date }) {
  const work = useMemo(() => getWorkState(now, settings.schedule), [now, settings.schedule]);
  const salary = useMemo(() => getSalarySnapshot(now, settings.salary, settings.schedule), [now, settings.salary, settings.schedule]);
  const weekend = useMemo(() => getWeekendCountdown(now, settings.schedule), [now, settings.schedule]);
  const payday = useMemo(() => getPaydayCountdown(now, settings.salary.payday), [now, settings.salary.payday]);
  const selectedItems = settings.miniMode.items;
  const countdown = work.status === 'off-day' ? '今天不用上班' : work.status === 'after' ? '今日已完成' : formatDuration(work.status === 'before' ? Math.max(0, (work.endAt.getTime() - now.getTime()) / 1000) : work.remainingSeconds);
  const lastSize = useRef('');

  useEffect(() => {
    document.documentElement.classList.add('mini-mode');
    document.body.classList.add('mini-mode');
    return () => {
      document.documentElement.classList.remove('mini-mode');
      document.body.classList.remove('mini-mode');
    };
  }, []);
  useEffect(() => {
    void setMiniClickThrough(settings.miniMode.clickThrough).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const element = document.querySelector<HTMLElement>('.mini-widget');
    if (!element) return;
    let frame = 0;
    const resize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const widgetRect = element.getBoundingClientRect();
        const width = Math.ceil(widgetRect.width);
        const height = Math.ceil(widgetRect.height);
        const size = `${width}x${height}`;
        if (size === lastSize.current) return;
        lastSize.current = size;
        void resizeMiniWindow(width, height);
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    void document.fonts?.ready.then(resize);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const startMiniDragging = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || settings.miniMode.clickThrough || !('__TAURI_INTERNALS__' in window)) return;
    event.preventDefault();
    void getCurrentWindow().startDragging().catch(() => undefined);
  };
  const itemValue = (key: MiniContentKey): string => {
    if (key === 'offTime') return countdown;
    if (key === 'income') return formatMoney(salary.todayIncome);
    if (key === 'progress') return `${Math.round(work.progress * 100)}%`;
    if (key === 'weekend') return weekend.weekend ? '周末模式' : weekend.label;
    if (key === 'payday') return payday.label;
    return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  return <div className="mini-widget" onDoubleClick={() => void openMainWindow()} onContextMenu={(event) => { event.preventDefault(); void showMiniMenu(); }}>
    <div className="mini-drag-region" onMouseDown={startMiniDragging}>
      <div className="mini-header"><span className="mini-brand">W</span><span>WorkJoy</span></div>
      <div className="mini-items">{selectedItems.length ? selectedItems.map((key) => <div className="mini-item" key={key}><span>{miniContentOptions.find((option) => option.key === key)?.label}</span><strong>{itemValue(key)}</strong></div>) : <div className="mini-empty">右键选择显示内容</div>}</div>
    </div>
  </div>;
}

function MiniMenuWindow({ settings, update }: { settings: AppSettings; update: Setter }) {
  const selectedItems = settings.miniMode.items;
  useEffect(() => {
    document.documentElement.classList.add('mini-mode');
    document.body.classList.add('mini-mode');
    return () => {
      document.documentElement.classList.remove('mini-mode');
      document.body.classList.remove('mini-mode');
    };
  }, []);
  const updateMiniMode = (miniMode: AppSettings['miniMode']) => {
    const nextSettings = { ...settings, miniMode };
    update(nextSettings);
    // Persist immediately so a newly opened main/mini window cannot reload stale options.
    void saveSettings(nextSettings).catch(() => undefined);
    if ('__TAURI_INTERNALS__' in window) {
      void Promise.all([
        emitTo('mini', 'mini-mode-updated', miniMode),
        emitTo('main', 'mini-mode-updated', miniMode)
      ]);
    }
  };
  const toggleItem = (key: MiniContentKey) => {
    const items = selectedItems.includes(key) ? selectedItems.filter((item) => item !== key) : [...selectedItems, key];
    updateMiniMode({ ...settings.miniMode, items });
  };
  const toggleClickThrough = async () => {
    const clickThrough = !settings.miniMode.clickThrough;
    try { await setMiniClickThrough(clickThrough); } catch { return; }
    updateMiniMode({ ...settings.miniMode, clickThrough });
    if (clickThrough) void hideMiniMenu();
  };
  return <div className="mini-menu" onContextMenu={(event) => event.preventDefault()}>
    <div className="mini-menu-title">显示内容</div>
    {miniContentOptions.map((option) => { const selected = selectedItems.includes(option.key); return <button key={option.key} className={selected ? 'selected' : ''} onClick={() => toggleItem(option.key)}><span className={`mini-check ${selected ? 'selected' : ''}`}>{selected ? '✓' : ''}</span>{option.label}</button>; })}
    <button className={settings.miniMode.clickThrough ? 'selected' : ''} onClick={() => void toggleClickThrough()}><span className={`mini-check ${settings.miniMode.clickThrough ? 'selected' : ''}`}>{settings.miniMode.clickThrough ? '✓' : ''}</span>开启穿透</button>
    <button className="mini-menu-close" onClick={() => void hideMiniMenu()}>完成</button>
  </div>;
}

function Sidebar({ page, setPage, onHide }: { page: AppPage; setPage: (page: AppPage) => void; onHide: () => void }) {
  const items: { id: AppPage; icon: string; label: string }[] = [{ id: 'dashboard', icon: '⌂', label: '今日概览' }, { id: 'focus', icon: '◷', label: '专注番茄' }, { id: 'reader', icon: '▤', label: '阅读条' }, { id: 'settings', icon: '⚙', label: '设置' }];
  return <aside className="sidebar">
    <div className="logo"><div className="brand-mark">W</div><div><strong>WorkJoy</strong><small>工位能量站</small></div></div>
    <nav>{items.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
    <div className="sidebar-bottom"><div className="privacy-note"><span>●</span><div><strong>本地运行</strong><small>你的数据只在这台电脑上</small></div></div><button className="nav-item" onClick={onHide}><span className="nav-icon">⌄</span>收进托盘</button></div>
  </aside>;
}

function SetupWizard({ settings, update }: { settings: AppSettings; update: Setter }) {
  const [step, setStep] = useState(0);
  const next = () => step < 1 ? setStep(step + 1) : update({ ...settings, configured: true });
  const salary = settings.salary;
  const updateSalary = (nextSalary: SalarySettings) => update({ ...settings, salary: nextSalary });
  return <div className="onboarding"><div className="onboarding-card">
    <div className="onboarding-head"><div className="brand-mark">W</div><span>0{step + 1} / 02</span></div>
    {step === 0 ? <>
      <span className="eyebrow">先把节奏交给你自己</span>
      <h1>你的工作日，<br /><em>从几点开始？</em></h1>
      <p className="lead">WorkJoy 会根据你的工作时间，算出今天还剩多久，也让每一秒的努力有一点回响。</p>
      <div className="form-grid">
        <label>上班时间<input type="time" value={settings.schedule.startTime} onChange={(e) => update({ ...settings, schedule: { ...settings.schedule, startTime: e.target.value } })} /></label>
        <label>下班时间<input type="time" value={settings.schedule.endTime} onChange={(e) => update({ ...settings, schedule: { ...settings.schedule, endTime: e.target.value } })} /></label>
        <label>午休开始<input type="time" value={settings.schedule.lunchStart} onChange={(e) => update({ ...settings, schedule: { ...settings.schedule, lunchStart: e.target.value } })} /></label>
        <label>午休结束<input type="time" value={settings.schedule.lunchEnd} onChange={(e) => update({ ...settings, schedule: { ...settings.schedule, lunchEnd: e.target.value } })} /></label>
      </div>
      <label className="full-field">工作日<div className="weekday-picker">{['日','一','二','三','四','五','六'].map((label, day) => <button type="button" key={day} className={settings.schedule.workDays.includes(day) ? 'selected' : ''} onClick={() => update({ ...settings, schedule: { ...settings.schedule, workDays: settings.schedule.workDays.includes(day) ? settings.schedule.workDays.filter((value) => value !== day) : [...settings.schedule.workDays, day].sort() } })}>{label}</button>)}</div></label>
    </> : <>
      <span className="eyebrow">让时间有一个温柔的刻度</span>
      <h1>每个月，<br /><em>你想为自己记下多少？</em></h1>
      <p className="lead">填写工资与个人扣款，让实时收入更接近实际。暂时不清楚也可以继续，所有数字仅保存在本机。</p>
      <div className="salary-input"><span>¥</span><input type="number" min="0" step="100" value={salary.monthlySalary} onChange={(e) => { const value = parseNumberInput(e.target.value, 0); if (value !== null) updateSalary({ ...salary, monthlySalary: value }); }} /><small>{salary.salaryType === 'preTax' ? '税前月薪' : '税后月薪'}</small></div>
      <label className="full-field">工资口径<select value={salary.salaryType} onChange={(e) => updateSalary({ ...salary, salaryType: e.target.value as SalarySettings['salaryType'] })}><option value="preTax">税前月薪（扣除个人扣款）</option><option value="afterTax">税后月薪（直接计算）</option></select></label>
      {salary.salaryType === 'preTax' && <SalaryDeductionFields salary={salary} onChange={updateSalary} />}
      <label className="full-field">每月发薪日<input type="number" min="1" max="31" value={salary.payday} onChange={(e) => { const value = parseNumberInput(e.target.value, 1, 31); if (value !== null) updateSalary({ ...salary, payday: value }); }} /></label>
    </>}
    <button className="primary-button onboarding-button" onClick={next}>{step === 0 ? '继续' : '开始使用 WorkJoy'} <span>→</span></button><div className="step-dots"><i className={step === 0 ? 'active' : ''}></i><i className={step === 1 ? 'active' : ''}></i></div>
  </div></div>;
}

function SalaryDeductionFields({ salary, onChange }: { salary: SalarySettings; onChange: (salary: SalarySettings) => void }) {
  const updateNumber = (key: 'socialInsuranceRate' | 'housingFundRate' | 'otherDeductions' | 'estimatedMonthlyTax', raw: string, max = Number.MAX_SAFE_INTEGER) => {
    const value = parseNumberInput(raw, 0, max);
    if (value !== null) onChange({ ...salary, [key]: value });
  };
  return <div className="salary-deductions">
    <div className="form-grid">
      <label>社保个人比例（%）<input type="number" min="0" max="100" step="0.1" value={salary.socialInsuranceRate} onChange={(e) => updateNumber('socialInsuranceRate', e.target.value, 100)} /></label>
      <label>公积金个人比例（%）<input type="number" min="0" max="100" step="0.1" value={salary.housingFundRate} onChange={(e) => updateNumber('housingFundRate', e.target.value, 100)} /></label>
      <label>每月预估个税（元）<input type="number" min="0" step="10" value={salary.estimatedMonthlyTax} onChange={(e) => updateNumber('estimatedMonthlyTax', e.target.value)} /></label>
      <label>每月其他固定扣除（元）<input type="number" min="0" step="10" value={salary.otherDeductions} onChange={(e) => updateNumber('otherDeductions', e.target.value)} /></label>
    </div>
    <p className="salary-deduction-hint">社保和公积金按税前月薪作为缴纳基数估算，实际扣款请以工资单为准。</p>
    <label className="salary-accuracy"><input type="checkbox" checked={!salary.deductionsEstimated} onChange={(e) => onChange({ ...salary, deductionsEstimated: !e.target.checked })} /><span>我已确认以上扣款数据准确</span></label>
    {salary.deductionsEstimated && <p className="salary-warning" role="status">扣款数据尚未确认，实时工资可能不准确，但不影响软件正常使用；之后可在“设置 → 收入设置”中修改。</p>}
  </div>;
}

function Dashboard({ now, settings, setPage }: { now: Date; settings: AppSettings; setPage: (page: AppPage) => void }) {
  const [incomeClock, setIncomeClock] = useState({ time: now, tick: 0 });
  useEffect(() => {
    const timer = window.setInterval(() => setIncomeClock((current) => ({ time: new Date(), tick: current.tick + 1 })), 200);
    return () => window.clearInterval(timer);
  }, []);
  const work = useMemo(() => getWorkState(now, settings.schedule), [now, settings.schedule]);
  const salary = useMemo(() => getSalarySnapshot(incomeClock.time, settings.salary, settings.schedule), [incomeClock.time, settings.salary, settings.schedule]);
  const incomeDelta = salary.perSecond / 5;
  const weekend = useMemo(() => getWeekendCountdown(now, settings.schedule), [now, settings.schedule]);
  const payday = useMemo(() => getPaydayCountdown(now, settings.salary.payday), [now, settings.salary.payday]);
  const countdown = work.status === 'before' ? formatDuration(Math.max(0, (work.endAt.getTime() - now.getTime()) / 1000)) : formatDuration(work.remainingSeconds);
  const statusText = work.status === 'off-day' ? '今天不用上班，给自己放个小假。' : work.status === 'after' ? '今日工作已完成 🎉' : work.status === 'lunch' ? '午休时间，先把饭吃好。' : work.status === 'before' ? '还没到上班时间，慢慢来。' : '稳住节奏，今天也在向前。';
  return <div className="page-stack"><section className="hero-card">
    <div className="hero-copy"><span className="card-kicker">{work.status === 'off-day' ? 'DAY OFF' : 'TODAY AT WORK'}</span><h2>{work.status === 'off-day' ? '今天不用上班' : work.status === 'after' ? '今日工作已完成 🎉' : '距离下班'}</h2>{work.status !== 'off-day' && work.status !== 'after' ? <div className="big-time">{countdown}</div> : <div className="big-time soft">☕</div>}<p>{statusText}</p></div>
    <div className="progress-ring" style={{ '--progress': `${work.progress * 360}deg` } as React.CSSProperties}><div><strong>{Math.round(work.progress * 100)}<small>%</small></strong><span>今日进度</span></div></div>
    <div className="progress-bar"><span style={{ width: `${work.progress * 100}%` }}></span></div><div className="hero-meta"><span>{settings.schedule.startTime} 开始</span><span>{settings.schedule.endTime} 结束</span></div>
  </section><section className="income-card"><div><span className="card-kicker">TIME VALUE / {settings.salary.salaryType === 'preTax' ? settings.salary.deductionsEstimated ? '税后估算 · 待确认' : '税后估算' : '税后'}</span><h3>今天已经赚到</h3><div className="income-total-row"><div className="income-number">{formatMoney(salary.todayIncome)}</div>{salary.active && incomeClock.tick > 0 && incomeDelta > 0 && <span key={incomeClock.tick} className="income-delta" aria-hidden="true">+{formatMoney(incomeDelta, 4)}</span>}</div><p className="muted">+ {formatMoney(salary.perSecond, 4)} / 秒 <span>· {settings.salary.salaryType === 'preTax' && settings.salary.deductionsEstimated ? '扣款待确认，仅供参考' : '仅为时间折算'}</span></p></div><div className="coin-stack">¥</div></section>
  <div className="stats-grid"><StatCard icon="☕" title="距离周末" value={weekend.label} sub={weekend.weekend ? '享受今天的慢节奏' : '再坚持一下'} /><StatCard icon="◌" title="距离发工资" value={payday.label} sub={`每月 ${settings.salary.payday} 日`} /><StatCard icon="🍅" title="专注一下" value="25:00" sub="现在开始一轮" action={() => setPage('focus')} /></div>
  <section className="quick-row"><div><span className="card-kicker">A LITTLE REMINDER</span><h3>别忘了给身体一点空间</h3><p className="muted">喝口水，站起来，看看窗外。</p></div><div className="quick-actions"><button onClick={() => void notify('WorkJoy', '该喝水啦，给身体一点空间。')}>💧 喝水</button><button onClick={() => void notify('WorkJoy', '让眼睛离开屏幕 20 秒。')}>👀 看远处</button><button onClick={() => setPage('reader')}>▤ 读两段</button></div></section></div>;
}

function StatCard({ icon, title, value, sub, action }: { icon: string; title: string; value: string; sub: string; action?: () => void }) { return <button className={`stat-card ${action ? 'clickable' : ''}`} onClick={action}><span className="stat-icon">{icon}</span><span className="card-kicker">{title}</span><strong>{value}</strong><small>{sub}</small></button>; }

function FocusPage({ settings, update }: { settings: AppSettings; update: Setter }) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(settings.pomodoro.workMinutes * 60);
  const secondsRef = useRef(seconds);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (secondsRef.current > 1) {
        secondsRef.current -= 1;
        setSeconds(secondsRef.current);
        return;
      }
      const nextMode = mode === 'work' ? 'break' : 'work';
      const nextSeconds = (nextMode === 'work' ? settings.pomodoro.workMinutes : settings.pomodoro.breakMinutes) * 60;
      secondsRef.current = nextSeconds;
      setMode(nextMode);
      setRunning(false);
      setSeconds(nextSeconds);
      void notify('WorkJoy · 番茄钟', mode === 'work' ? '专注完成，休息一下吧。' : '休息结束，准备开始下一轮。');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, settings.pomodoro]);
  const total = (mode === 'work' ? settings.pomodoro.workMinutes : settings.pomodoro.breakMinutes) * 60;
  const pct = 1 - seconds / Math.max(1, total);
  const reset = () => { setRunning(false); setSeconds((mode === 'work' ? settings.pomodoro.workMinutes : settings.pomodoro.breakMinutes) * 60); };
  return <div className="focus-layout"><section className="focus-card"><span className="card-kicker">{mode === 'work' ? 'FOCUS MODE' : 'BREAK MODE'}</span><h2>{mode === 'work' ? '专注这一小段' : '休息，什么都不用完成'}</h2><div className="focus-timer" style={{ '--progress': `${pct * 360}deg` } as React.CSSProperties}><strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><span>{mode === 'work' ? '把注意力放在眼前' : '喝口水，动一动'}</span></div><div className="focus-controls"><button className="primary-button" onClick={() => setRunning(!running)}>{running ? '暂停' : seconds === total ? '开始专注' : '继续'} <span>{running ? 'Ⅱ' : '▶'}</span></button><button className="text-button" onClick={reset}>重置</button></div></section><section className="settings-card"><span className="card-kicker">POMODORO SETTINGS</span><h3>找到你的节奏</h3><label>工作时长<input type="number" min="1" max="120" value={settings.pomodoro.workMinutes} onChange={(e) => { const value = parseNumberInput(e.target.value, 1, 120); if (value === null) return; update((current) => ({ ...current, pomodoro: { ...current.pomodoro, workMinutes: value } })); if (!running && mode === 'work') setSeconds(value * 60); }} /><small>分钟</small></label><label>休息时长<input type="number" min="1" max="60" value={settings.pomodoro.breakMinutes} onChange={(e) => { const value = parseNumberInput(e.target.value, 1, 60); if (value === null) return; update((current) => ({ ...current, pomodoro: { ...current.pomodoro, breakMinutes: value } })); if (!running && mode === 'break') setSeconds(value * 60); }} /><small>分钟</small></label><div className="mode-toggle"><button className={mode === 'work' ? 'active' : ''} onClick={() => { setMode('work'); setRunning(false); setSeconds(settings.pomodoro.workMinutes * 60); }}>工作</button><button className={mode === 'break' ? 'active' : ''} onClick={() => { setMode('break'); setRunning(false); setSeconds(settings.pomodoro.breakMinutes * 60); }}>休息</button></div></section></div>;
}

function ReaderPage({ settings, update }: { settings: AppSettings; update: Setter }) {
  const [auto, setAuto] = useState(false);
  const updateRef = useRef(update);
  useEffect(() => { updateRef.current = update; }, [update]);
  useEffect(() => { if (!auto || !settings.readerState.paragraphs.length) return; const timer = window.setInterval(() => updateRef.current((current) => { const lastParagraph = current.readerState.paragraphs.length - 1; if (current.readerState.currentParagraph >= lastParagraph) { setAuto(false); return current; } return { ...current, readerState: { ...current.readerState, currentParagraph: current.readerState.currentParagraph + 1, lastReadAt: new Date().toISOString() } }; }), settings.reader.autoScrollSeconds * 1000); return () => window.clearInterval(timer); }, [auto, settings.reader.autoScrollSeconds, settings.readerState.paragraphs.length]);
  const state = settings.readerState;
  const selectFile = async () => {
    const result = await chooseTextFile();
    if (result) update((current) => ({ ...current, readerState: { filePath: result.path, fileName: result.name, paragraphs: splitText(result.text), currentParagraph: 0, lastReadAt: new Date().toISOString() } }));
  };
  const browserFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); update((current) => ({ ...current, readerState: { filePath: file.name, fileName: file.name, paragraphs: splitText(text), currentParagraph: 0, lastReadAt: new Date().toISOString() } })); };
  const move = (delta: number) => update((current) => ({ ...current, readerState: { ...current.readerState, currentParagraph: Math.max(0, Math.min(current.readerState.paragraphs.length - 1, current.readerState.currentParagraph + delta)), lastReadAt: new Date().toISOString() } }));
  return <div className="reader-layout"><section className="reader-card"><div className="reader-toolbar"><div><span className="card-kicker">READING BAR</span><h2>{state.fileName || '给自己读两段'}</h2></div><div className="reader-actions"><button className="secondary-button" onClick={() => void selectFile()}>导入 TXT</button><label className="secondary-button browser-file">浏览器选择<input type="file" accept=".txt,text/plain" onChange={(e) => void browserFile(e)} /></label></div></div>{state.paragraphs.length ? <><div className="reading-strip" style={{ fontFamily: settings.reader.fontFamily, fontSize: settings.reader.fontSize, opacity: settings.reader.opacity }}>{state.paragraphs[state.currentParagraph]}</div><div className="reader-nav"><button onClick={() => move(-1)}>← 上一段</button><span>{state.currentParagraph + 1} / {state.paragraphs.length}</span><button onClick={() => move(1)}>下一段 →</button></div><div className="reader-nav"><button className={auto ? 'active-pill' : ''} onClick={() => setAuto(!auto)}>{auto ? 'Ⅱ 暂停自动滚动' : '▶ 自动滚动'}</button><span className="muted">每 {settings.reader.autoScrollSeconds} 秒</span></div></> : <div className="empty-reader"><div className="empty-icon">▤</div><h3>导入一本 TXT</h3><p>只保存阅读位置，不会复制或上传你的整本书。</p><button className="primary-button" onClick={() => void selectFile()}>选择文件 <span>→</span></button></div>}</section><section className="settings-card"><span className="card-kicker">READING PREFERENCES</span><h3>调到舒服的位置</h3><label>字体<select value={settings.reader.fontFamily} onChange={(e) => update((current) => ({ ...current, reader: { ...current.reader, fontFamily: e.target.value } }))}><option>Noto Sans SC Variable</option><option>Inter Variable</option><option>Microsoft YaHei</option><option>Segoe UI</option><option>SimSun</option></select></label><label>字号<input type="range" min="12" max="32" value={settings.reader.fontSize} onChange={(e) => update((current) => ({ ...current, reader: { ...current.reader, fontSize: Number(e.target.value) } }))} /><span className="range-value">{settings.reader.fontSize}px</span></label><label>透明度<input type="range" min="0.5" max="1" step="0.05" value={settings.reader.opacity} onChange={(e) => update((current) => ({ ...current, reader: { ...current.reader, opacity: Number(e.target.value) } }))} /><span className="range-value">{Math.round(settings.reader.opacity * 100)}%</span></label><label>自动滚动间隔<input type="number" min="2" max="60" value={settings.reader.autoScrollSeconds} onChange={(e) => { const value = parseNumberInput(e.target.value, 2, 60); if (value !== null) update((current) => ({ ...current, reader: { ...current.reader, autoScrollSeconds: value } })); }} /><small>秒</small></label></section></div>;
}

function splitText(text: string): string[] { return text.replace(/\r/g, '').split(/\n\s*\n|\n/).map((part) => part.trim()).filter(Boolean); }

function parseNumberInput(raw: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null;
}

function miniModeEqual(left: AppSettings['miniMode'], right: AppSettings['miniMode']): boolean {
  return left.clickThrough === right.clickThrough && left.items.length === right.items.length && left.items.every((item, index) => item === right.items[index]);
}

function SettingsPage({ settings, update }: { settings: AppSettings; update: Setter }) {
  const toggleDay = (day: number) => update((current) => ({ ...current, schedule: { ...current.schedule, workDays: current.schedule.workDays.includes(day) ? current.schedule.workDays.filter((value) => value !== day) : [...current.schedule.workDays, day].sort() } }));
  const toggleMiniItem = (key: MiniContentKey) => update((current) => ({ ...current, miniMode: { ...current.miniMode, items: current.miniMode.items.includes(key) ? current.miniMode.items.filter((item) => item !== key) : [...current.miniMode.items, key] } }));
  const toggleMiniClickThrough = async () => {
    const nextValue = !settings.miniMode.clickThrough;
    try { await setMiniClickThrough(nextValue); } catch { return; }
    update((current) => current.miniMode.clickThrough === nextValue ? current : { ...current, miniMode: { ...current.miniMode, clickThrough: nextValue } });
  };
  return <div className="settings-page">
    <section className="settings-card wide">
      <div className="section-heading"><div><span className="card-kicker">YOUR RHYTHM</span><div className="section-title"><h2>工作设置</h2><span className="section-description">时间计算均在本机完成</span></div></div></div>
      <div className="form-grid"><label>上班时间<input type="time" value={settings.schedule.startTime} onChange={(e) => update((c) => ({ ...c, schedule: { ...c.schedule, startTime: e.target.value } }))} /></label><label>下班时间<input type="time" value={settings.schedule.endTime} onChange={(e) => update((c) => ({ ...c, schedule: { ...c.schedule, endTime: e.target.value } }))} /></label><label>午休开始<input type="time" value={settings.schedule.lunchStart} onChange={(e) => update((c) => ({ ...c, schedule: { ...c.schedule, lunchStart: e.target.value } }))} /></label><label>午休结束<input type="time" value={settings.schedule.lunchEnd} onChange={(e) => update((c) => ({ ...c, schedule: { ...c.schedule, lunchEnd: e.target.value } }))} /></label></div>
      <div className="setting-row"><span>工作日</span><div className="weekday-picker compact">{['日','一','二','三','四','五','六'].map((label, day) => <button key={day} className={settings.schedule.workDays.includes(day) ? 'selected' : ''} onClick={() => toggleDay(day)}>{label}</button>)}</div></div>
    </section>
    <section className="settings-card wide">
      <div className="section-heading"><div><span className="card-kicker">TIME VALUE</span><div className="section-title"><h2>收入设置</h2><span className="section-description">仅作时间折算，不代表真实结算</span></div></div></div>
      <div className="form-grid">
        <label>{settings.salary.salaryType === 'preTax' ? '税前月薪' : '税后月薪'}<input type="number" min="0" value={settings.salary.monthlySalary} onChange={(e) => { const value = parseNumberInput(e.target.value, 0); if (value !== null) update((c) => ({ ...c, salary: { ...c.salary, monthlySalary: value } })); }} /></label>
        <label>发薪日<input type="number" min="1" max="31" value={settings.salary.payday} onChange={(e) => { const value = parseNumberInput(e.target.value, 1, 31); if (value !== null) update((c) => ({ ...c, salary: { ...c.salary, payday: value } })); }} /></label>
      </div>
      <div className="segmented salary-type-toggle"><button className={settings.salary.salaryType === 'preTax' ? 'active' : ''} onClick={() => update((c) => ({ ...c, salary: { ...c.salary, salaryType: 'preTax' } }))}>税前（计算扣款）</button><button className={settings.salary.salaryType === 'afterTax' ? 'active' : ''} onClick={() => update((c) => ({ ...c, salary: { ...c.salary, salaryType: 'afterTax' } }))}>税后（直接计算）</button></div>
      {settings.salary.salaryType === 'preTax' && <SalaryDeductionFields salary={settings.salary} onChange={(salary) => update((c) => ({ ...c, salary }))} />}
    </section>
    <section className="settings-card wide">
      <div className="section-heading"><div><span className="card-kicker">GENTLE REMINDERS</span><div className="section-title"><h2>休息提醒</h2><span className="section-description">只通过系统通知，不打断全屏工作</span></div></div></div>
      <ReminderRow label="喝水提醒" enabled={settings.reminders.waterEnabled} interval={settings.reminders.waterIntervalMinutes} onEnabled={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, waterEnabled: value } }))} onInterval={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, waterIntervalMinutes: value } }))} /><ReminderRow label="久坐提醒" enabled={settings.reminders.sittingEnabled} interval={settings.reminders.sittingIntervalMinutes} onEnabled={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, sittingEnabled: value } }))} onInterval={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, sittingIntervalMinutes: value } }))} /><ReminderRow label="眼睛休息" enabled={settings.reminders.eyeEnabled} interval={settings.reminders.eyeIntervalMinutes} onEnabled={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, eyeEnabled: value } }))} onInterval={(value) => update((c) => ({ ...c, reminders: { ...c.reminders, eyeIntervalMinutes: value } }))} />
    </section>
    <section className="settings-card wide">
      <div className="section-heading"><div><span className="card-kicker">APP PREFERENCES</span><h2>软件设置</h2></div></div>
      <div className="setting-row"><span>主题</span><div className="segmented"><button className={settings.theme === 'system' ? 'active' : ''} onClick={() => update((c) => ({ ...c, theme: 'system' }))}>跟随系统</button><button className={settings.theme === 'light' ? 'active' : ''} onClick={() => update((c) => ({ ...c, theme: 'light' }))}>浅色</button><button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => update((c) => ({ ...c, theme: 'dark' }))}>深色</button></div></div>
      <div className="setting-row"><span>开机自动启动</span><button className={`switch ${settings.launchAtStartup ? 'on' : ''}`} onClick={() => update((c) => ({ ...c, launchAtStartup: !c.launchAtStartup }))}><i></i></button></div>
      <div className="setting-row startup-mode-row"><div><strong>以极简模式启动</strong><small>下次启动时直接显示极简窗口</small></div><button className={`switch ${settings.startInMiniMode ? 'on' : ''}`} aria-label="切换以极简模式启动" onClick={() => update((c) => ({ ...c, startInMiniMode: !c.startInMiniMode }))}><i></i></button></div>
      <div className="setting-row"><span>全局隐藏快捷键</span><input className="shortcut-input" value={settings.globalShortcut} onChange={(e) => update((c) => ({ ...c, globalShortcut: e.target.value }))} /></div>
      <div className="setting-row"><span>关闭按钮行为</span><div className="segmented"><button className={settings.closeBehavior === 'ask' ? 'active' : ''} onClick={() => update((c) => ({ ...c, closeBehavior: 'ask' }))}>每次询问</button><button className={settings.closeBehavior === 'minimize' ? 'active' : ''} onClick={() => update((c) => ({ ...c, closeBehavior: 'minimize' }))}>最小化</button><button className={settings.closeBehavior === 'exit' ? 'active' : ''} onClick={() => update((c) => ({ ...c, closeBehavior: 'exit' }))}>退出</button><button className={settings.closeBehavior === 'minimal' ? 'active' : ''} onClick={() => update((c) => ({ ...c, closeBehavior: 'minimal' }))}>极简</button></div></div>
    </section>
    <section className="settings-card wide">
      <div className="section-heading"><div><span className="card-kicker">MINIMAL MODE</span><h2>极简模式显示内容</h2></div><span className="muted">也可以在右下角窗口上右键调整</span></div>
      <div className="mini-setting-grid">{miniContentOptions.map((option) => <button key={option.key} className={`mini-setting-option ${settings.miniMode.items.includes(option.key) ? 'selected' : ''}`} onClick={() => toggleMiniItem(option.key)}><span>{settings.miniMode.items.includes(option.key) ? '✓' : '+'}</span>{option.label}</button>)}</div>
      <div className="setting-row mini-setting-row"><div><strong>鼠标穿透</strong><small>开启后无法在极简界面上点击或拖动，可在此处关闭</small></div><button className={`switch ${settings.miniMode.clickThrough ? 'on' : ''}`} aria-label="切换鼠标穿透" onClick={() => void toggleMiniClickThrough()}><i></i></button></div>
    </section>
  </div>;
}

function ReminderRow({ label, enabled, interval, onEnabled, onInterval }: { label: string; enabled: boolean; interval: number; onEnabled: (value: boolean) => void; onInterval: (value: number) => void }) { return <div className="reminder-row"><div><strong>{label}</strong><small>每隔一段时间轻轻提醒你</small></div><input type="number" min="1" max="240" value={interval} onChange={(e) => { const value = parseNumberInput(e.target.value, 1, 240); if (value !== null) onInterval(value); }} /><span>分钟</span><button className={`switch ${enabled ? 'on' : ''}`} onClick={() => onEnabled(!enabled)}><i></i></button></div>; }

export default App;
