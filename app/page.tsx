'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { ArrowRight, Camera, Check, ChevronRight, CircleUserRound, Home, ListChecks, LogOut, Mic, Scale, WandSparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BalanceView } from '@/components/loadlight/BalanceView';
import { Lumi } from '@/components/loadlight/Lumi';
import { TasksView } from '@/components/loadlight/TasksView';
import { WhatIfView } from '@/components/loadlight/WhatIfView';
import { profile, timelineLabels, todayFiveLoads, weekPlan } from '@/lib/loadlight/demo-data';
import { defaultStoredState, loadStoredState, saveStoredState } from '@/lib/loadlight/storage';
import type { AppView, CheckInMood, JournalEntry, StoredLoadLightState } from '@/lib/loadlight/types';

const loadRows = [
  { key: 'mental', label: 'Mental', mark: 'M', tone: 'lavender' },
  { key: 'time', label: 'Time', mark: 'T', tone: 'blue' },
  { key: 'physical', label: 'Physical', mark: 'P', tone: 'peach' },
  { key: 'social', label: 'Social', mark: 'S', tone: 'pink' },
  { key: 'errands', label: 'Errands', mark: 'E', tone: 'sage' },
] as const;

const moodOptions: Array<{ value: CheckInMood; label: string }> = [
  { value: 'calm', label: 'Calm' }, { value: 'steady', label: 'Okay' },
  { value: 'tired', label: 'Tired' }, { value: 'stressed', label: 'Stressed' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
];

const weeklyLumiStates = ['calm', 'steady', 'tired', 'stressed', 'recovering', 'calm', 'calm'] as const;

const navItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'tasks' as const, label: 'Tasks', icon: ListChecks },
  { id: 'what-if' as const, label: 'What-if', icon: WandSparkles, featured: true },
  { id: 'balance' as const, label: 'Balance', icon: Scale },
  { id: 'me' as const, label: 'Me', icon: CircleUserRound },
];

function Header({ label, title }: { label: string; title: string }) {
  return <header className="page-header"><p className="date-label">{label}</p><h1>{title}</h1></header>;
}


function LoginView({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Add your email and password to continue.'); return; }
    onLogin(email.trim());
  }
  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand-lockup"><span className="brand-mark">✦</span><strong>LoadLight</strong></div>
    <Lumi state="calm" size="large" message="A quiet place to notice what you’re carrying." />
    <div className="login-copy"><p className="micro-label">WELCOME BACK</p><h1 id="login-title">Let’s make today a little lighter.</h1></div>
    <form onSubmit={submit} className="login-form">
      <label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" size="lg" className="primary-action">Log in <ArrowRight /></Button>
    </form>
    <div className="login-links"><button type="button">Forgot password?</button><button type="button">Sign up</button></div>
    <p className="prototype-note">Prototype login · your entries stay on this device.</p>
  </section></main>;
}

function HomeView({ stored, onSave, onNavigate }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void; onNavigate: (view: AppView) => void }) {
  const [selectedMood, setSelectedMood] = useState<CheckInMood>(stored.selectedMood ?? 'steady');
  const [journalNote, setJournalNote] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [journalOpen, setJournalOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [mediaMessage, setMediaMessage] = useState('');

  function chooseMood(mood: CheckInMood) { setSelectedMood(mood); setJournalOpen(true); }
  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 1_500_000) { setMediaMessage('Choose an image smaller than 1.5 MB for this prototype.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setPhotoDataUrl(String(reader.result ?? '')); setMediaMessage('Photo ready to save with your entry.'); };
    reader.readAsDataURL(file);
  }
  function mockSpeech() {
    const next = speechText ? '' : 'I have a lot on my mind, but writing it down helped.';
    setSpeechText(next); setMediaMessage(next ? 'Voice note transcribed for the prototype.' : 'Voice note removed.');
  }
  function saveJournal() {
    const entry: JournalEntry = { id: `journal-${Date.now()}`, date: timelineLabels.today, mood: selectedMood, note: journalNote.trim(), speechTranscript: speechText || undefined, photoDataUrl: photoDataUrl || undefined };
    onSave({ ...stored, selectedMood, journalEntries: [entry, ...stored.journalEntries].slice(0, 12) }, 'Check-in and journal saved on this device.');
    setJournalNote(''); setSpeechText(''); setPhotoDataUrl(''); setJournalOpen(false);
  }

  return <div className="view-content home-view">
    <Header label="GOOD AFTERNOON" title="Hi, Mia." />
    <p className="home-intro">{timelineLabels.today}</p>

    <section className="load-hero" aria-label="Tuesday current load is 78 percent">
      <Lumi state="tired" size="large" />
      <div className="hero-copy"><h2>Getting a little full.</h2><p className="hero-load"><strong>78%</strong> of today’s load</p><p>Thursday may need a little more room.</p></div>
    </section>

    <section className="editorial-section five-loads" aria-labelledby="five-loads-title">
      <div className="section-title"><div><h2 id="five-loads-title">What’s taking the most space today</h2></div></div>
      <div className="load-list">{loadRows.map((row) => { const value = todayFiveLoads[row.key]; return <div className="load-row" key={row.key}>
        <span className={`load-mark ${row.tone}`} aria-hidden="true">{row.mark}</span><span>{row.label}</span>
        <div className="thin-track" role="progressbar" aria-label={`${row.label} load`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong>
      </div>; })}</div>
    </section>

    <section className="editorial-section check-in" aria-labelledby="check-in-title">
      <div className="section-title"><div><h2 id="check-in-title">Which Lumi feels like you today?</h2></div></div>
      <div className="mood-row" role="group" aria-label="Choose how you feel">{moodOptions.map((option) => <button key={option.value} type="button" className={selectedMood === option.value ? 'selected' : ''} aria-pressed={selectedMood === option.value} onClick={() => chooseMood(option.value)}><Lumi state={option.value} size="small" /><span>{option.label}</span></button>)}</div>
      <button className="journal-entry-link" type="button" onClick={() => setJournalOpen((open) => !open)}><span><strong>Want to leave something here?</strong><small>Write, speak, or keep a photo with today.</small></span><ChevronRight /></button>
      {journalOpen && <div className="journal-composer">
        <Textarea value={journalNote} onChange={(event) => setJournalNote(event.target.value)} placeholder="What made today feel this way?" aria-label="Journal note" />
        {speechText && <blockquote>{speechText}</blockquote>}
        {photoDataUrl && <div className="photo-preview"><img src={photoDataUrl} alt="Journal upload preview" /><button type="button" aria-label="Remove photo" onClick={() => setPhotoDataUrl('')}><X /></button></div>}
        <div className="journal-tools"><Button type="button" variant="outline" size="sm" onClick={mockSpeech}><Mic /> Speak</Button><label className="photo-button"><Camera /> Photo<input type="file" accept="image/*" onChange={handlePhoto} /></label><Button type="button" size="sm" onClick={saveJournal}><Check /> Save</Button></div>
        {mediaMessage && <p className="media-message" role="status">{mediaMessage}</p>}
      </div>}
    </section>

    <section className="editorial-section week-section" aria-labelledby="week-title">
      <div className="section-title"><div><span className="diary-accent">This week</span><h2 id="week-title">A few little moments</h2></div></div>
      <div className="mood-timeline">{weekPlan.map((day, index) => <div key={`${day.dayLabel}-${index}`} className={day.dayLabel === 'Tue' ? 'today' : ''}><span>{day.dayLabel}</span><Lumi state={weeklyLumiStates[index]} size="small" />{(day.dayLabel === 'Wed' || day.dayLabel === 'Thu') ? <small>{day.load}%</small> : <small aria-hidden="true">&nbsp;</small>}</div>)}</div>
      <p>Things begin feeling heavier on Wednesday.</p><button className="text-link" type="button" onClick={() => setReplayOpen(true)}>Replay my week <ArrowRight /></button>
    </section>

    <section className="insight-strip"><Lumi state="steady" size="small" /><div><p className="companion-label">Lumi noticed something</p><strong>Your busiest days seem to happen when study deadlines + work shifts overlap.</strong><button className="text-link" type="button" onClick={() => setInsightOpen(true)}>See what Lumi noticed <ArrowRight /></button></div></section>
    <section className="what-if-callout"><div><span className="section-kicker">Before you say yes...</span><h2>See what one more commitment would do to your week.</h2><button className="text-link what-if-link" type="button" onClick={() => onNavigate('what-if')}>Try it first <ArrowRight /></button></div><Lumi state="stressed" size="large" /></section>

    {replayOpen && <InfoSheet title="A gentle replay" onClose={() => setReplayOpen(false)}><div className="replay-list"><article><Lumi state="calm" size="small" /><p><strong>Monday · Calm</strong><span>A quieter start with room between classes.</span></p></article><article><Lumi state="steady" size="small" /><p><strong>Tuesday · Okay</strong><span>You wrote: “A full day, but I still had room to pause.”</span></p></article><article><Lumi state="tired" size="small" /><p><strong>Wednesday · Tired</strong><span>Preparation for Thursday’s review made the day feel heavier.</span></p></article></div></InfoSheet>}
    {insightOpen && <InfoSheet title="Why Lumi noticed this" onClose={() => setInsightOpen(false)}><p className="sheet-body">Thursday combines a fixed assignment deadline, a prototype review, preparation work and errands. This is a workload pattern—not a diagnosis.</p></InfoSheet>}
  </div>;
}

function TeammatePlaceholder({ title }: { title: 'Tasks' | 'What-if' | 'Balance' }) {
  return <div className="view-content placeholder-view"><div><p className="micro-label">TEAM SPACE</p><h1>{title}</h1><span>Coming from teammate</span></div></div>;
}

function MeView({ onLogout }: { onLogout: () => void }) {
  return <div className="view-content placeholder-view"><div><p className="micro-label">ACCOUNT</p><h1>Me</h1><span>Coming from teammate</span><Button variant="outline" className="logout-button" onClick={onLogout}><LogOut /> Log out</Button></div></div>;
}

function InfoSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}><button className="modal-backdrop" type="button" onClick={onClose} aria-label="Close" /><section className="info-sheet"><div className="sheet-top"><div><span className="micro-label">TAKE A LOOK BACK</span><h2>{title}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>{children}</section></div>;
}

export default function LoadLightApp() {
  const [view, setView] = useState<AppView>('home');
  const [stored, setStored] = useState<StoredLoadLightState>(defaultStoredState);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => { setStored(loadStoredState()); setHydrated(true); }, []);
  function persist(next: StoredLoadLightState, message = '') { setStored(next); saveStoredState(next); if (message) { setToast(message); window.setTimeout(() => setToast(''), 2600); } }
  function login(email: string) { persist({ ...stored, isLoggedIn: true, email }, 'Welcome back, Mia.'); }
  function logout() { persist({ ...stored, isLoggedIn: false }, 'You’re safely logged out.'); setView('home'); }
  if (!hydrated) return <main className="loading-page"><span>✦</span><p>Making a little room…</p></main>;
  if (!stored.isLoggedIn) return <LoginView onLogin={login} />;
  return <main className="app-shell"><section className="phone-frame" aria-label="LoadLight student workload manager">
    {view === 'home' && <HomeView stored={stored} onSave={persist} onNavigate={setView} />}{view === 'tasks' && <TasksView stored={stored} onSave={persist} />}{view === 'what-if' && <WhatIfView stored={stored} onSave={persist} />}{view === 'balance' && <BalanceView />}{view === 'me' && <MeView onLogout={logout} />}
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ id, label, icon: Icon, featured }) => <Button key={id} variant="ghost" className={`${view === id ? 'active' : ''} ${featured ? 'featured' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}><Icon /><span>{label}</span></Button>)}</nav>
    {toast && <output className="toast" aria-live="polite"><Check /> {toast}</output>}
  </section><aside className="desktop-note" aria-hidden="true"><span>✦</span><p><strong>LoadLight</strong><small>Make room to breathe.</small></p></aside></main>;
}
