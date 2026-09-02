'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BatteryMedium,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Home as HomeIcon,
  Leaf,
  ListRestart,
  MoonStar,
  Plus,
  ShieldCheck,
  Sparkles,
  SunMedium,
  WandSparkles,
  X,
} from 'lucide-react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'lg' | 'icon';
};

function Button({ variant = 'default', size, className = '', children, ...props }: ButtonProps) {
  return <button className={`ui-button ui-${variant} ${size ? `ui-${size}` : ''} ${className}`} {...props}>{children}</button>;
}

function Slider({ value, onValueChange, min = 0, max = 100 }: { value: number[]; onValueChange: (value: number[]) => void; min?: number; max?: number }) {
  return <input className="native-slider" type="range" min={min} max={max} value={value[0]} onChange={(event) => onValueChange([Number(event.target.value)])} />;
}

type View = 'today' | 'forecast' | 'balance' | 'me';

const loads = [
  { label: 'Mental', value: 86, color: '#9d89c9', note: 'Assignment + presentation' },
  { label: 'Time', value: 78, color: '#72b9d5', note: 'Two close deadlines' },
  { label: 'Physical', value: 42, color: '#eaae70', note: 'Energy is steady' },
  { label: 'Social', value: 54, color: '#e89ab1', note: 'Group meeting later' },
  { label: 'Errands', value: 61, color: '#8fbd96', note: 'Groceries pending' },
];

const week = [
  { day: 'Mon', date: 31, value: 64, mood: 'calm' },
  { day: 'Tue', date: 1, value: 72, mood: 'okay' },
  { day: 'Wed', date: 2, value: 78, mood: 'busy', today: true },
  { day: 'Thu', date: 3, value: 104, mood: 'full' },
  { day: 'Fri', date: 4, value: 89, mood: 'busy' },
  { day: 'Sat', date: 5, value: 56, mood: 'calm' },
  { day: 'Sun', date: 6, value: 38, mood: 'rest' },
];

const navItems = [
  { id: 'today' as const, label: 'Today', icon: HomeIcon },
  { id: 'forecast' as const, label: 'Forecast', icon: CalendarDays },
  { id: 'balance' as const, label: 'Balance', icon: ListRestart },
  { id: 'me' as const, label: 'Me', icon: CircleUserRound },
];

function Lumi({ level = 78, small = false }: { level?: number; small?: boolean }) {
  const state = level > 95 ? 'overloaded' : level > 75 ? 'getting full' : 'breathing easy';
  return (
    <div className={`lumi ${small ? 'lumi-small' : ''} ${level > 95 ? 'lumi-alert' : ''}`} aria-label={`Lumi is ${state}`}>
      <Sparkles aria-hidden="true" />
      <span className="lumi-face" aria-hidden="true">{level > 95 ? '·︵·' : level > 75 ? '•﹏•' : '•ᴗ•'}</span>
    </div>
  );
}

function Header({ title, eyebrow = 'Tuesday, 2 September', onBack }: { title: string; eyebrow?: string; onBack?: () => void }) {
  return (
    <header className="topbar">
      <div className="header-title">
        {onBack && <Button variant="ghost" size="icon" className="back-button" onClick={onBack} aria-label="Go back"><ArrowLeft /></Button>}
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      </div>
      <Button variant="outline" size="icon" className="icon-button" aria-label="Notifications"><Bell /></Button>
    </header>
  );
}

function TodayView({ onSimulate, onCheckIn, onNavigate }: { onSimulate: () => void; onCheckIn: () => void; onNavigate: (view: View) => void }) {
  return (
    <div className="view-content">
      <Header title="Good afternoon, Mia" />

      <section className="capacity-card">
        <Lumi />
        <div className="capacity-copy">
          <p className="eyebrow">Your capacity today</p>
          <div className="score-row"><strong>78%</strong><span>getting full</span></div>
          <p>You still have room, but Thursday needs a gentler plan.</p>
        </div>
      </section>

      <div className="gentle-prompt">
        <SunMedium aria-hidden="true" />
        <div><strong>How are you arriving today?</strong><span>A 20-second check-in helps Lumi learn your rhythm.</span></div>
        <Button variant="secondary" size="sm" onClick={onCheckIn}>Check in</Button>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Your five energies</p><h2>What is taking space</h2></div>
          <Button variant="ghost" size="sm" className="text-button" onClick={() => onNavigate('forecast')}>Details <ArrowRight /></Button>
        </div>
        <div className="load-list">
          {loads.map((load) => (
            <div className="load-row" key={load.label} title={load.note}>
              <div className="load-label"><span style={{ background: load.color }} />{load.label}</div>
              <div className="track" role="progressbar" aria-label={`${load.label} load`} aria-valuenow={load.value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${load.value}%`, background: load.color }} /></div>
              <strong>{load.value}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="forecast-card">
        <div className="forecast-copy"><div><p className="eyebrow">A little heads-up</p><h2>Thursday may reach 104%</h2><p>Two deadlines and your evening shift overlap.</p></div><div className="mini-orbit"><span>Thu</span><strong>104%</strong></div></div>
        <Button size="lg" className="primary-button" onClick={onSimulate}><Plus /> Simulate a new commitment</Button>
      </section>
    </div>
  );
}

function ForecastView({ onSimulate }: { onSimulate: () => void }) {
  const [selected, setSelected] = useState(3);
  const activeDay = week.find((d) => d.date === selected) ?? week[3];
  return (
    <div className="view-content">
      <Header title="Your week, at a glance" eyebrow="Seven-day forecast" />
      <section className="week-strip" aria-label="Weekly capacity forecast">
        {week.map((item) => (
          <Button key={item.date} variant="ghost" className={`day-cell ${selected === item.date ? 'selected' : ''} ${item.value > 100 ? 'danger' : ''}`} onClick={() => setSelected(item.date)} aria-pressed={selected === item.date}>
            <span>{item.day}</span><strong>{item.date}</strong><i style={{ height: `${Math.max(12, Math.min(item.value, 100) * .45)}px` }} /><small>{item.value}%</small>
          </Button>
        ))}
      </section>

      <section className={`day-story ${activeDay.value > 100 ? 'day-story-alert' : ''}`}>
        <div className="day-story-top"><Lumi level={activeDay.value} small /><div><p className="eyebrow">{activeDay.day}, September {activeDay.date}</p><h2>{activeDay.value > 100 ? 'Your plate is overflowing' : activeDay.value > 75 ? 'A fairly full day' : 'You have breathing room'}</h2></div><strong>{activeDay.value}%</strong></div>
        <p>{activeDay.value > 100 ? 'Your Data Structures deadline, evening shift and team call overlap without a recovery window.' : 'Your commitments fit within your usual capacity. Keep a little space for the unexpected.'}</p>
      </section>

      <section className="section-block timeline-card">
        <div className="section-heading"><div><p className="eyebrow">Why it feels heavy</p><h2>Thursday’s load story</h2></div></div>
        <div className="timeline">
          <div><span className="time-dot purple" /><time>9:00 AM</time><p><strong>Data Structures</strong><small>High mental load · 2.5h</small></p></div>
          <div><span className="time-dot blue" /><time>2:00 PM</time><p><strong>Prototype review</strong><small>Mental + social · 1.5h</small></p></div>
          <div><span className="time-dot yellow" /><time>6:00 PM</time><p><strong>Café shift</strong><small>Time + physical · 5h</small></p></div>
        </div>
      </section>
      <Button size="lg" className="primary-button sticky-action" onClick={onSimulate}><WandSparkles /> Try a what-if</Button>
    </div>
  );
}

function BalanceView({ balanced, onApply }: { balanced: boolean; onApply: () => void }) {
  const [choices, setChoices] = useState([true, true, true]);
  const toggle = (index: number) => setChoices((current) => current.map((v, i) => i === index ? !v : v));
  const after = Math.max(78, 104 - choices.filter(Boolean).length * 7);
  const actions = [
    { icon: Clock3, title: 'Split the assignment', copy: 'Move research to Wednesday; keep writing on Thursday.', gain: '−8%' },
    { icon: MoonStar, title: 'Protect your sleep', copy: 'End the team call at 9:30 PM instead of 11 PM.', gain: '−7%' },
    { icon: Leaf, title: 'Group your errands', copy: 'Move groceries beside Friday’s library trip.', gain: '−6%' },
  ];
  return (
    <div className="view-content">
      <Header title={balanced ? 'You made some room' : 'Let’s lighten Thursday'} eyebrow="Your balance plan" />
      <section className={`balance-hero ${balanced ? 'balanced' : ''}`}>
        <Lumi level={balanced ? after : 104} small />
        <div><p className="eyebrow">Projected capacity</p><div className="before-after"><span><small>Before</small><del>104%</del></span><ArrowRight /><span><small>After</small><strong>{balanced ? after : after}%</strong></span></div></div>
      </section>
      <div className="section-heading balance-heading"><div><p className="eyebrow">Lumi’s gentle plan</p><h2>Choose what feels possible</h2></div></div>
      <div className="action-list">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return <Button key={action.title} variant="outline" className={`action-card ${choices[index] ? 'chosen' : ''}`} onClick={() => toggle(index)} aria-pressed={choices[index]}>
            <span className="action-icon"><Icon /></span><span className="action-copy"><strong>{action.title}</strong><small>{action.copy}</small></span><span className="gain">{choices[index] ? action.gain : '+'}</span>
          </Button>;
        })}
      </div>
      <div className="recovery-note"><Heart aria-hidden="true" /><div><strong>Recovery match</strong><span>A quiet 25-minute meal break fits your mental load best.</span></div></div>
      <Button size="lg" className="primary-button" onClick={onApply}>{balanced ? <Check /> : <Sparkles />}{balanced ? 'Plan applied' : `Apply plan · ${after}%`}</Button>
    </div>
  );
}

function MeView() {
  return (
    <div className="view-content">
      <Header title="Your rhythm" eyebrow="Personal baseline" />
      <section className="profile-card"><Lumi level={62} /><div><p className="eyebrow">Learning gently</p><h2>Mia’s capacity baseline</h2><p>Built from 12 check-ins. You tend to recover best after quiet evenings and 7+ hours of sleep.</p></div></section>
      <section className="section-block insight-list">
        <div className="section-heading"><div><p className="eyebrow">Patterns, not judgments</p><h2>What Lumi has noticed</h2></div></div>
        <div><span className="insight-icon lavender"><MoonStar /></span><p><strong>Sleep changes everything</strong><small>Below 6 hours, your mental capacity fills 18% faster.</small></p></div>
        <div><span className="insight-icon yellow"><SunMedium /></span><p><strong>Your best focus window</strong><small>Complex tasks feel lighter between 10 AM and 1 PM.</small></p></div>
        <div><span className="insight-icon green"><Leaf /></span><p><strong>Recovery that works</strong><small>Short walks have helped on 4 of your last 5 busy days.</small></p></div>
      </section>
      <section className="privacy-card"><ShieldCheck /><div><strong>Your data stays yours</strong><span>Capacity estimates are wellness guidance, not a medical diagnosis.</span></div><ChevronRight /></section>
    </div>
  );
}

function CheckInSheet({ onClose }: { onClose: (saved?: boolean) => void }) {
  const [energy, setEnergy] = useState([58]);
  const [stress, setStress] = useState([72]);
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
      <button className="modal-backdrop" onClick={() => onClose()} aria-label="Close check-in" />
      <section className="sheet">
        <div className="sheet-handle" /><div className="sheet-title"><div><p className="eyebrow">20-second check-in</p><h2 id="checkin-title">How are you arriving?</h2></div><Button variant="ghost" size="icon" onClick={() => onClose()} aria-label="Close"><X /></Button></div>
        <div className="feeling-picker" aria-label="Choose your feeling"><Button variant="ghost">😌<span>Steady</span></Button><Button variant="ghost" className="picked">😵‍💫<span>Stretched</span></Button><Button variant="ghost">😞<span>Drained</span></Button></div>
        <label className="slider-label"><span><strong>Energy</strong><small>{energy[0]}%</small></span><Slider value={energy} onValueChange={(value) => setEnergy(value as number[])} /></label>
        <label className="slider-label"><span><strong>Stress</strong><small>{stress[0]}%</small></span><Slider value={stress} onValueChange={(value) => setStress(value as number[])} /></label>
        <Button size="lg" className="primary-button" onClick={() => onClose(true)}><Heart /> Save gently</Button>
      </section>
    </div>
  );
}

function SimulatorSheet({ onClose, onBalance }: { onClose: () => void; onBalance: () => void }) {
  const [hours, setHours] = useState([4]);
  const [mental, setMental] = useState([70]);
  const projected = useMemo(() => Math.min(124, 78 + hours[0] * 4 + Math.round(mental[0] / 15)), [hours, mental]);
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="sim-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close simulator" />
      <section className="sheet simulator-sheet">
        <div className="sheet-handle" /><div className="sheet-title"><div><p className="eyebrow">Before you say yes</p><h2 id="sim-title">Try the commitment on</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>
        <label className="field-label">What is it?<input defaultValue="Extra café shift" /></label>
        <div className="quick-tags"><Button variant="secondary" size="sm">Work</Button><Button variant="outline" size="sm">Study</Button><Button variant="outline" size="sm">Social</Button><Button variant="outline" size="sm">Errand</Button></div>
        <label className="slider-label"><span><strong>Time needed</strong><small>{hours[0]} hours</small></span><Slider min={1} max={8} value={hours} onValueChange={(value) => setHours(value as number[])} /></label>
        <label className="slider-label"><span><strong>Mental effort</strong><small>{mental[0]}%</small></span><Slider value={mental} onValueChange={(value) => setMental(value as number[])} /></label>
        <div className={`simulation-result ${projected > 100 ? 'result-alert' : ''}`}><BatteryMedium /><div><span>Thursday would become</span><strong>{projected}% full</strong><small>{projected > 100 ? 'Sleep and assignment quality are most at risk.' : 'This still fits, with a small recovery window.'}</small></div></div>
        <Button size="lg" className="primary-button" onClick={onBalance}><WandSparkles /> Show me a safer plan</Button>
      </section>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>('today');
  const [sheet, setSheet] = useState<'checkin' | 'simulate' | null>(null);
  const [toast, setToast] = useState('');
  const [balanced, setBalanced] = useState(false);
  const closeCheckIn = (saved?: boolean) => { setSheet(null); if (saved) { setToast('Check-in saved — thank you for showing up.'); setTimeout(() => setToast(''), 2800); } };
  const goToBalance = () => { setSheet(null); setView('balance'); };
  const applyPlan = () => { setBalanced(true); setToast('Your Thursday now has breathing room.'); setTimeout(() => setToast(''), 2800); };
  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="LoadLight student capacity planner">
        {view === 'today' && <TodayView onSimulate={() => setSheet('simulate')} onCheckIn={() => setSheet('checkin')} onNavigate={setView} />}
        {view === 'forecast' && <ForecastView onSimulate={() => setSheet('simulate')} />}
        {view === 'balance' && <BalanceView balanced={balanced} onApply={applyPlan} />}
        {view === 'me' && <MeView />}
        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className={view === id ? 'active' : ''} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}><Icon /><span>{label}</span></Button>)}
        </nav>
        {sheet === 'checkin' && <CheckInSheet onClose={closeCheckIn} />}
        {sheet === 'simulate' && <SimulatorSheet onClose={() => setSheet(null)} onBalance={goToBalance} />}
        {toast && <output className="toast" aria-live="polite"><Check />{toast}</output>}
      </section>
      <aside className="desktop-note" aria-hidden="true"><span>✦</span><p><strong>LoadLight</strong><small>Make room to breathe.</small></p></aside>
    </main>
  );
}
