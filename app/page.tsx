'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, BookOpenText, Camera, Check, ChevronRight, CircleHelp, CircleUserRound, Home, ListChecks, LockKeyhole, LogOut, Mic, Moon, Palette, Scale, Search, ShieldCheck, SquarePen, UserRoundCog, WandSparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BalanceView } from '@/components/loadlight/BalanceView';
import { LoginView } from '@/components/loadlight/LoginView';
import { Lumi } from '@/components/loadlight/Lumi';
import { SupportChat } from '@/components/loadlight/SupportChat';
import { TasksView } from '@/components/loadlight/TasksView';
import { WhatIfView } from '@/components/loadlight/WhatIfView';
import { timelineLabels, todayFiveLoads, weekPlan } from '@/lib/loadlight/demo-data';
import { activeWeekTaskLoad } from '@/lib/loadlight/load-logic';
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

const journalTagOptions = ['Class', 'Work', 'Family', 'Rest', 'Deadline', 'Small win'];

const weeklyLumiStates = ['calm', 'steady', 'tired', 'stressed', 'sleepy', 'recovering', 'relieved'] as const;

const navItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'tasks' as const, label: 'Tasks', icon: ListChecks },
  { id: 'what-if' as const, label: 'What-if', icon: WandSparkles, featured: true },
  { id: 'balance' as const, label: 'Balance', icon: Scale },
  { id: 'me' as const, label: 'Me', icon: CircleUserRound },
];

const topBarTitles: Record<AppView, string> = {
  home: 'Today',
  tasks: 'My Tasks',
  'what-if': 'Can I take this?',
  balance: 'Balance Room',
  me: 'Profile',
};

const demoSteps: Array<{ view: AppView; title: string; line: string; cue: string }> = [
  {
    view: 'tasks',
    title: 'Add tasks first',
    line: 'Mia adds her commitments here, and LoadLight turns them into a load percentage automatically.',
    cue: 'Say: The load score starts from real tasks, not a random mood number.',
  },
  {
    view: 'home',
    title: 'See the load',
    line: 'Now the dashboard shows how full today feels, so the student can notice risk early.',
    cue: 'Say: LoadLight helps students notice overload before it becomes burnout.',
  },
  {
    view: 'what-if',
    title: 'Test before saying yes',
    line: 'Before accepting a new commitment, What-if predicts how much extra pressure it adds.',
    cue: 'Tap What-if, then show the current load becoming a risky future load.',
  },
  {
    view: 'balance',
    title: 'Fix the overload',
    line: 'Balance turns the warning into action: move, keep, or drop tasks until the day is lighter.',
    cue: 'Tap AI auto plan, then confirm only when the plan feels right.',
  },
  {
    view: 'balance',
    title: 'Care for the person',
    line: 'Care gives recovery, reflection, and boundary replies when the issue is emotional or social.',
    cue: 'Tap Care, then Boundary to show Lumi writing a calmer reply.',
  },
];

function Header({ label, title }: { label: string; title: string }) {
  return <header className="page-header"><p className="date-label">{label}</p><h1>{title}</h1></header>;
}

function AppTopBar({ onCompose, title, showCompose }: { onCompose: () => void; title: string; showCompose: boolean }) {
  return <header className="app-topbar" aria-label="LoadLight app header">
    <span className="topbar-spacer" aria-hidden="true" />
    <div className="topbar-title"><strong>{title}</strong></div>
    {showCompose ? <Button type="button" variant="ghost" size="icon" className="topbar-icon compose" aria-label="Write today note" onClick={onCompose}><SquarePen /></Button> : <span className="topbar-spacer" aria-hidden="true" />}
  </header>;
}


function DashboardLoadingView() {
  return <main className="app-shell"><section className="phone-frame loading-frame" aria-label="Preparing your LoadLight dashboard">
    <div className="dashboard-loader">
      <div className="loader-top"><div className="brand-lockup"><span className="brand-mark">✦</span><strong>LoadLight</strong></div></div>
      <div className="loader-center">
        <Lumi state="focused" size="large" message="Making a little room for today." />
        <div className="loader-copy">
          <p className="micro-label">SETTING UP</p>
          <h1>Finding a softer rhythm.</h1>
          <p>Checking your load with care.</p>
        </div>
      </div>
      <div className="loader-track" aria-hidden="true"><i /></div>
    </div>
  </section><aside className="desktop-note" aria-hidden="true"><span>✦</span><p><strong>LoadLight</strong><small>Lighten your load.</small></p></aside></main>;
}

function HomeView({ currentLoad, stored, onSave, onNavigate, composeSignal, onConsumeCompose }: { currentLoad: number; stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void; onNavigate: (view: AppView) => void; composeSignal: number; onConsumeCompose: () => void }) {
  const [selectedMood, setSelectedMood] = useState<CheckInMood>(stored.selectedMood ?? 'steady');
  const [pendingJournalMood, setPendingJournalMood] = useState<CheckInMood | null>(null);
  const [customJournalMood, setCustomJournalMood] = useState('');
  const [customMoodOpen, setCustomMoodOpen] = useState(false);
  const [journalPageOpen, setJournalPageOpen] = useState(false);
  const [journalStep, setJournalStep] = useState<'mood' | 'editor'>('mood');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalTags, setJournalTags] = useState<string[]>(['Class']);
  const [journalNote, setJournalNote] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [replayOpen, setReplayOpen] = useState(false);
  const [journalHistoryOpen, setJournalHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMoodFilter, setHistoryMoodFilter] = useState<'all' | CheckInMood | 'custom'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('all');
  const [insightOpen, setInsightOpen] = useState(false);
  const [mediaMessage, setMediaMessage] = useState('');
  const cardCarouselRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!composeSignal) return;
    setPendingJournalMood(null);
    setCustomJournalMood('');
    setCustomMoodOpen(false);
    setJournalStep('mood');
    setJournalPageOpen(true);
    onConsumeCompose();
  }, [composeSignal, onConsumeCompose]);

  function openJournalPage() { setPendingJournalMood(null); setCustomJournalMood(''); setCustomMoodOpen(false); setJournalStep('mood'); setJournalPageOpen(true); }
  function chooseJournalMood(mood: CheckInMood) { setPendingJournalMood(mood); setCustomJournalMood(''); setCustomMoodOpen(false); }
  function chooseCustomMood() { setPendingJournalMood('steady'); setCustomMoodOpen(true); }
  function continueJournalMood() {
    if (!pendingJournalMood || (customMoodOpen && !customJournalMood.trim())) return;
    setSelectedMood(pendingJournalMood);
    setJournalStep('editor');
  }
  function closeJournalPage() {
    if (journalStep === 'editor') { setJournalStep('mood'); return; }
    setJournalPageOpen(false);
  }
  function moveCards(direction: 'left' | 'right') {
    const carousel = cardCarouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector<HTMLElement>('.home-swipe-card');
    const distance = firstCard ? firstCard.offsetWidth + 12 : carousel.clientWidth * .82;
    carousel.scrollBy({ left: direction === 'right' ? distance : -distance, behavior: 'smooth' });
  }
  function toggleJournalTag(tag: string) {
    setJournalTags((tags) => tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]);
  }
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
    const cleanTitle = journalTitle.trim();
    const cleanMood = customJournalMood.trim();
    const entry: JournalEntry = { id: `journal-${Date.now()}`, date: timelineLabels.today, mood: selectedMood, moodLabel: cleanMood || undefined, title: cleanTitle || undefined, tags: journalTags.length ? journalTags : undefined, note: journalNote.trim(), speechTranscript: speechText || undefined, photoDataUrl: photoDataUrl || undefined };
    onSave({ ...stored, selectedMood, journalEntries: [entry, ...stored.journalEntries].slice(0, 12) }, 'Check-in and journal saved on this device.');
    setJournalTitle(''); setJournalNote(''); setSpeechText(''); setPhotoDataUrl(''); setPendingJournalMood(null); setCustomJournalMood(''); setCustomMoodOpen(false); setJournalStep('mood'); setJournalPageOpen(false);
  }
  const todayTaskPreview = stored.tasks?.slice(0, 4) ?? [];
  const historyCount = stored.journalEntries.length;
  const fallbackJournalHistory: JournalEntry[] = [
    { id: 'demo-note-1', date: 'Monday, 1 September', moodLabel: 'Calm', title: 'A softer start', note: 'I had space between classes and it helped me breathe.' },
    { id: 'demo-note-2', date: 'Wednesday, 16 September', moodLabel: 'Tired', title: 'A lot on my mind', note: 'Revision and group project work made the week feel heavier.' },
  ].map((entry) => ({ ...entry, mood: entry.moodLabel === 'Tired' ? 'tired' : 'calm' }));
  const journalHistory = stored.journalEntries.length ? stored.journalEntries : fallbackJournalHistory;
  function historyDateParts(date: string) {
    const [dayPart = date, rest = ''] = date.split(', ');
    return { day: dayPart.slice(0, 3), date: rest.replace('September', 'Sep') || dayPart };
  }
  const historyDates = Array.from(new Set(journalHistory.map((entry) => entry.date)));
  const filteredJournalHistory = journalHistory.filter((entry) => {
    const search = historySearch.trim().toLowerCase();
    const text = [entry.title, entry.date, entry.moodLabel, entry.mood, entry.note, entry.speechTranscript, ...(entry.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesMood = historyMoodFilter === 'all' || (historyMoodFilter === 'custom' ? Boolean(entry.moodLabel) : entry.mood === historyMoodFilter);
    const matchesDate = historyDateFilter === 'all' || entry.date === historyDateFilter;
    return matchesSearch && matchesMood && matchesDate;
  });
  function togglePreviewTask(taskId: string) {
    const tasks = stored.tasks ?? [];
    onSave(
      { ...stored, tasks: tasks.map((task) => task.id === taskId ? { ...task, status: task.status === 'done' ? 'not-started' : 'done' } : task) },
      'Today task updated.',
    );
  }

  return <div className="view-content home-view">
    <Header label="GOOD AFTERNOON" title="Hi, Mia." />
    <p className="home-intro">{timelineLabels.today}</p>

    <div className="home-carousel-wrap">
      <Button type="button" variant="ghost" size="icon" className="carousel-arrow carousel-arrow-left" aria-label="Previous card" onClick={() => moveCards('left')}><ArrowLeft /></Button>
      <section className="home-card-carousel" aria-label="Today cards" ref={cardCarouselRef}>
        <article className="home-swipe-card load-card" aria-label={`Current load is ${currentLoad} percent`}>
          <div className="hero-copy"><div className="home-card-meta"><strong>Current load</strong><span>From tasks</span></div><h2>{currentLoad >= 100 ? 'Too full right now.' : currentLoad >= 85 ? 'Getting a little full.' : 'Still manageable.'}</h2><p className="hero-load"><strong>{currentLoad}%</strong><span>of today’s load</span></p><p>{currentLoad >= 85 ? 'Check before adding more.' : 'There is still some room.'}</p></div>
          <div className="card-lumi-panel"><Lumi state="tired" size="large" /><span>Plan lighter</span></div>
        </article>
        <article className="home-swipe-card diary-card" aria-label="Write today journal">
          <div className="card-lumi-panel"><Lumi state="sleepy" size="large" /><span>Journal</span></div>
          <div className="diary-card-copy"><div className="diary-card-date"><strong>09</strong><span>September</span></div><span>Tonight, leave it here.</span><p>Mood first, then one note with Lumi.</p><Button className="primary-action diary-card-action" type="button" onClick={openJournalPage}>Record today <ArrowRight /></Button></div>
        </article>
        <article className="home-swipe-card tasks-card" aria-label="Today task list">
          <div className="tasks-card-title"><span><ListChecks /></span><div><strong>Today tasks</strong><small>Point form focus</small></div></div>
          <ul>{todayTaskPreview.map((task) => <li key={task.id} className={task.status === 'done' ? 'done' : ''}><button type="button" aria-label={`${task.status === 'done' ? 'Undo' : 'Mark'} ${task.title}`} onClick={() => togglePreviewTask(task.id)}>{task.status === 'done' && <Check />}</button><span>{task.title}</span></li>)}</ul>
          <Button className="tasks-card-action" type="button" variant="ghost" onClick={() => onNavigate('tasks')}>Open tasks <ArrowRight /></Button>
        </article>
        <article className="home-swipe-card history-card" aria-label="Journal history">
          <div className="history-card-art"><Lumi state="relieved" size="large" /></div>
          <div className="history-card-copy">
            <div className="history-card-top"><span><BookOpenText /></span><small>{historyCount || 'Demo'} saved</small></div>
            <strong>Look back gently.</strong>
            <p>Your past notes stay here, ready when you want to remember what helped.</p>
            <Button className="history-card-action" type="button" onClick={() => setJournalHistoryOpen(true)}>View journal history <ArrowRight /></Button>
          </div>
        </article>
      </section>
      <Button type="button" variant="ghost" size="icon" className="carousel-arrow carousel-arrow-right" aria-label="Next card" onClick={() => moveCards('right')}><ArrowRight /></Button>
      <div className="carousel-hint" aria-hidden="true"><span /><span /><span /><span /></div>
    </div>

    <section className="editorial-section five-loads" aria-labelledby="five-loads-title">
      <div className="section-title"><div><h2 id="five-loads-title">What’s taking the most space today</h2></div></div>
      <div className="load-list">{loadRows.map((row) => { const value = todayFiveLoads[row.key]; return <div className="load-row" key={row.key}>
        <span className={`load-mark ${row.tone}`} aria-hidden="true">{row.mark}</span><span>{row.label}</span>
        <div className="thin-track" role="progressbar" aria-label={`${row.label} load`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong>
      </div>; })}</div>
    </section>

    <section className="editorial-section week-section" aria-labelledby="week-title">
      <div className="section-title"><div><span className="diary-accent">This week</span><h2 id="week-title">A few little moments</h2></div></div>
      <div className="mood-timeline">{weekPlan.map((day, index) => <div key={`${day.dayLabel}-${index}`} className={day.dayLabel === 'Tue' ? 'today' : ''}><span>{day.dayLabel}</span><Lumi state={weeklyLumiStates[index]} size="small" />{(day.dayLabel === 'Wed' || day.dayLabel === 'Thu') ? <small>{day.load}%</small> : <small aria-hidden="true">&nbsp;</small>}</div>)}</div>
      <p>Things begin feeling heavier on Wednesday.</p><button className="text-link" type="button" onClick={() => setReplayOpen(true)}>Replay my week <ArrowRight /></button>
    </section>

    <section className="insight-strip"><Lumi state="thinking" size="small" /><div><p className="companion-label">Lumi noticed something</p><strong>Your busiest days seem to happen when study deadlines + work shifts overlap.</strong><button className="text-link" type="button" onClick={() => setInsightOpen(true)}>See what Lumi noticed <ArrowRight /></button></div></section>
    <section className="what-if-callout"><div><span className="section-kicker">Before you say yes...</span><h2>See what one more commitment would do to your week.</h2><button className="text-link what-if-link" type="button" onClick={() => onNavigate('what-if')}>Try it first <ArrowRight /></button></div><Lumi state="stressed" size="large" /></section>

    {replayOpen && <InfoSheet title="A gentle replay" onClose={() => setReplayOpen(false)}><div className="replay-list"><article><Lumi state="calm" size="small" /><p><strong>Monday · Calm</strong><span>A quieter start before the week gets busy.</span></p></article><article><Lumi state="steady" size="small" /><p><strong>Tuesday · Okay</strong><span>You wrote: “A full day, but I still had room to pause.”</span></p></article><article><Lumi state="tired" size="small" /><p><strong>Wednesday · Tired</strong><span>Revision and group project work made the day feel heavier.</span></p></article></div></InfoSheet>}
    {insightOpen && <InfoSheet title="Why Lumi noticed this" onClose={() => setInsightOpen(false)}><p className="sheet-body">Thursday combines an assignment, a group project meeting, revision, club preparation and errands. This is a workload pattern—not a diagnosis.</p></InfoSheet>}
    {journalHistoryOpen && <section className="journal-history-page" role="dialog" aria-modal="true" aria-label="Journal history page">
      <div className="journal-page-top">
        <Button type="button" variant="ghost" size="icon" aria-label="Back" onClick={() => setJournalHistoryOpen(false)}><ArrowLeft /></Button>
        <div><strong>Journal history</strong><span>{historyCount || 'Demo'} saved</span></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Write today note" onClick={openJournalPage}><SquarePen /></Button>
      </div>
      <div className="history-hero">
        <div><p className="micro-label">LOOK BACK</p><h2>Find the moments you left with Lumi.</h2><span>{filteredJournalHistory.length} note{filteredJournalHistory.length === 1 ? '' : 's'} showing</span></div>
        <Lumi state="relieved" size="small" />
      </div>
      <div className="history-search-box"><Search /><Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search title, mood, tag, note..." aria-label="Search journal history" /></div>
      <div className="history-date-row" role="group" aria-label="Filter journal history by date">
        <button type="button" className={historyDateFilter === 'all' ? 'selected' : ''} onClick={() => setHistoryDateFilter('all')}>All dates</button>
        {historyDates.map((date) => { const dateParts = historyDateParts(date); return <button key={date} type="button" className={historyDateFilter === date ? 'selected' : ''} onClick={() => setHistoryDateFilter(date)}><strong>{dateParts.day}</strong><span>{dateParts.date}</span></button>; })}
      </div>
      <div className="history-filter-row" role="group" aria-label="Filter journal history">
        <button type="button" className={historyMoodFilter === 'all' ? 'selected' : ''} onClick={() => setHistoryMoodFilter('all')}>All</button>
        {moodOptions.map((option) => <button key={option.value} type="button" className={historyMoodFilter === option.value ? 'selected' : ''} onClick={() => setHistoryMoodFilter(option.value)}>{option.label}</button>)}
        <button type="button" className={historyMoodFilter === 'custom' ? 'selected' : ''} onClick={() => setHistoryMoodFilter('custom')}>Custom</button>
      </div>
      <div className="journal-history-list full-page">{filteredJournalHistory.length ? filteredJournalHistory.map((entry) => { const dateParts = historyDateParts(entry.date); return <article key={entry.id}><div className="history-entry-date"><strong>{dateParts.day}</strong><span>{dateParts.date}</span></div><div className="history-entry-body"><div><strong>{entry.title || 'Untitled note'}</strong><span>{entry.moodLabel || entry.mood}</span></div>{entry.tags?.length ? <small>{entry.tags.join(' · ')}</small> : null}<p>{entry.note || entry.speechTranscript || 'A quiet check-in saved for this day.'}</p></div></article>; }) : <p className="empty-scenario-note">No journal matched. Try another word or filter.</p>}</div>
    </section>}
    {journalPageOpen && <section className={`journal-page ${journalStep === 'mood' ? 'journal-page-mood' : ''}`} role="dialog" aria-modal="true" aria-label="Write today journal">
      <div className="journal-page-top">
        <Button type="button" variant="ghost" size="icon" aria-label="Back" onClick={closeJournalPage}><X /></Button>
        <div><strong>{timelineLabels.today}</strong><span>{journalStep === 'mood' ? 'Choose mood' : 'Today journal'}</span></div>
        {journalStep === 'editor' ? <Button type="button" variant="ghost" size="icon" aria-label="Save journal" onClick={saveJournal}><Check /></Button> : <span aria-hidden="true" />}
      </div>
      {journalStep === 'mood' ? <div className="journal-mood-card">
        <div className="journal-mood-hero">
          <div>
            <p className="micro-label">CHECK IN</p>
            <h2>What did today feel like?</h2>
            <span>Choose one first. You can write after this.</span>
          </div>
          <Lumi state={pendingJournalMood ?? selectedMood} size="large" />
        </div>
        <div className="journal-mood-grid" role="group" aria-label="Choose journal mood">{moodOptions.map((option) => <button key={option.value} type="button" className={!customMoodOpen && pendingJournalMood === option.value ? 'selected' : ''} aria-pressed={!customMoodOpen && pendingJournalMood === option.value} onClick={() => chooseJournalMood(option.value)}>{option.label}</button>)}<button type="button" className={customMoodOpen ? 'selected custom-mood-button' : 'custom-mood-button'} aria-pressed={customMoodOpen} onClick={chooseCustomMood}>Custom</button></div>
        {customMoodOpen && <label className="custom-mood-field"><span>My own word for today</span><Input value={customJournalMood} onChange={(event) => setCustomJournalMood(event.target.value)} placeholder="e.g. hopeful, messy, numb..." maxLength={24} aria-label="Custom mood" /></label>}
        <Button type="button" className="primary-action journal-next-action" disabled={!pendingJournalMood || (customMoodOpen && !customJournalMood.trim())} onClick={continueJournalMood}>Next <ArrowRight /></Button>
      </div> : <div className="journal-editor-page">
        {photoDataUrl ? <div className="photo-preview journal-photo-preview"><img src={photoDataUrl} alt="Journal upload preview" /><button type="button" aria-label="Remove photo" onClick={() => setPhotoDataUrl('')}><X /></button></div> : <label className="journal-photo-upload"><Camera /><span>Add a photo</span><input type="file" accept="image/*" onChange={handlePhoto} /></label>}
        <Input className="journal-title-input" value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} placeholder="Title" aria-label="Journal title" />
        <div className="journal-tag-row" aria-label="Journal tags">{journalTagOptions.map((tag) => <button key={tag} type="button" className={journalTags.includes(tag) ? 'selected' : ''} onClick={() => toggleJournalTag(tag)}>{tag}</button>)}</div>
        <Textarea className="journal-page-textarea" value={journalNote} onChange={(event) => setJournalNote(event.target.value)} placeholder={"Lumi is listening.\nWhat made today feel light, heavy, or worth remembering?"} aria-label="Journal note" />
        {speechText && <blockquote>{speechText}</blockquote>}
        <div className="journal-page-tools"><button type="button" className="location-chip">Where I am</button><Button type="button" variant="outline" size="sm" onClick={mockSpeech}><Mic /> Speak</Button><Button type="button" size="sm" onClick={saveJournal}><Check /> Save</Button></div>
        {mediaMessage && <p className="media-message" role="status">{mediaMessage}</p>}
      </div>}
    </section>}
  </div>;
}

function TeammatePlaceholder({ title }: { title: 'Tasks' | 'What-if' | 'Balance' }) {
  return <div className="view-content placeholder-view"><div><p className="micro-label">TEAM SPACE</p><h1>{title}</h1><span>Coming from teammate</span></div></div>;
}

function MeView({ stored, onSave, onLogout }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void; onLogout: () => void }) {
  const [name, setName] = useState('Mia');
  const [email, setEmail] = useState('mia@student.edu');
  const [editingProfile, setEditingProfile] = useState(false);
  const [dailyCheckIn, setDailyCheckIn] = useState(true);
  const [gentleNudges, setGentleNudges] = useState(true);
  const [privateJournal, setPrivateJournal] = useState(true);
  const [calmMode, setCalmMode] = useState(false);
  const loadLimit = stored.loadLimit ?? 100;
  const [activeSheet, setActiveSheet] = useState<'account' | 'privacy' | 'support' | null>(null);

  return <div className="view-content me-view">
    <section className="me-profile-card" aria-labelledby="me-title">
      <div className="me-avatar"><Lumi state="steady" size="small" /></div>
      <div>
        <p className="micro-label">MY SPACE</p>
        <h1 id="me-title">{name}</h1>
        <span>{email}</span>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label="Edit profile" onClick={() => setEditingProfile((open) => !open)}><SquarePen /></Button>
    </section>

    {editingProfile && <section className="settings-card profile-editor" aria-label="Edit profile">
      <label>Name<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Email<Input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <Button type="button" className="primary-action" onClick={() => setEditingProfile(false)}><Check /> Save profile</Button>
    </section>}

    <section className="settings-card" aria-labelledby="load-preferences-title">
      <div className="settings-title"><span><Scale /></span><div><h2 id="load-preferences-title">Load preferences</h2><p>Tell Lumi when your week starts feeling too full.</p></div></div>
      <label className="load-limit-control">
        <span>Overload limit <strong>{loadLimit}%</strong></span>
        <input type="range" min="80" max="120" value={loadLimit} onChange={(event) => onSave({ ...stored, loadLimit: Number(event.target.value) }, 'Load preference saved.')} />
      </label>
      <button type="button" className={`setting-row ${calmMode ? 'enabled' : ''}`} onClick={() => setCalmMode((enabled) => !enabled)}>
        <span><Moon /> Calm mode</span>
        <i>{calmMode ? 'On' : 'Off'}</i>
      </button>
    </section>

    <section className="settings-card" aria-labelledby="settings-title">
      <div className="settings-title"><span><UserRoundCog /></span><div><h2 id="settings-title">Settings</h2><p>Small switches for daily use.</p></div></div>
      <button type="button" className={`setting-row ${dailyCheckIn ? 'enabled' : ''}`} onClick={() => setDailyCheckIn((enabled) => !enabled)}><span><Bell /> Daily check-in</span><i>{dailyCheckIn ? 'On' : 'Off'}</i></button>
      <button type="button" className={`setting-row ${gentleNudges ? 'enabled' : ''}`} onClick={() => setGentleNudges((enabled) => !enabled)}><span><WandSparkles /> Gentle nudges</span><i>{gentleNudges ? 'On' : 'Off'}</i></button>
      <button type="button" className={`setting-row ${privateJournal ? 'enabled' : ''}`} onClick={() => setPrivateJournal((enabled) => !enabled)}><span><LockKeyhole /> Private journal</span><i>{privateJournal ? 'Locked' : 'Open'}</i></button>
    </section>

    <section className="settings-card settings-links" aria-label="Account links">
      <button type="button" onClick={() => setActiveSheet('account')}><span><Palette /> Appearance</span><ChevronRight /></button>
      <button type="button" onClick={() => setActiveSheet('privacy')}><span><ShieldCheck /> Privacy and data</span><ChevronRight /></button>
      <button type="button" onClick={() => setActiveSheet('support')}><span><CircleHelp /> Help and feedback</span><ChevronRight /></button>
    </section>

    <Button variant="outline" className="logout-button" onClick={onLogout}><LogOut /> Log out</Button>

    {activeSheet && <InfoSheet title={activeSheet === 'account' ? 'Appearance' : activeSheet === 'privacy' ? 'Privacy and data' : 'Help and feedback'} onClose={() => setActiveSheet(null)}>
      {activeSheet === 'account' && <p className="sheet-body">Theme: LoadLight soft cream and purple. Calm mode can reduce visual pressure during stressful days.</p>}
      {activeSheet === 'privacy' && <p className="sheet-body">Prototype data stays on this device through local storage. Journal privacy is shown as a setting so the flow feels complete.</p>}
      {activeSheet === 'support' && <p className="sheet-body">Need help? Use Lumi chat for a soft check-in, or share feedback with the team during the prototype demo.</p>}
    </InfoSheet>}
  </div>;
}

function InfoSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}><button className="modal-backdrop" type="button" onClick={onClose} aria-label="Close" /><section className="info-sheet"><div className="sheet-top"><div><span className="micro-label">TAKE A LOOK BACK</span><h2>{title}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>{children}</section></div>;
}

function DemoGuide({ activeStep, onClose, onNext, onStart }: { activeStep: number; onClose: () => void; onNext: () => void; onStart: () => void }) {
  const step = demoSteps[activeStep];
  const isLastStep = activeStep === demoSteps.length - 1;

  return <aside className="demo-guide" aria-label="Demo mode guide">
    <div className="demo-guide-top">
      <span>Demo mode</span>
      <button type="button" aria-label="Close demo mode" onClick={onClose}><X /></button>
    </div>
    <div className="demo-progress" aria-hidden="true">
      {demoSteps.map((item, index) => <i className={index <= activeStep ? 'active' : ''} key={item.title} />)}
    </div>
    <strong>{activeStep + 1}. {step.title}</strong>
    <p>{step.line}</p>
    <small>{step.cue}</small>
    <div className="demo-guide-actions">
      <Button type="button" variant="outline" onClick={onStart}>Restart</Button>
      <Button type="button" className="primary-action" onClick={onNext}>{isLastStep ? 'Finish' : 'Next'} <ArrowRight /></Button>
    </div>
  </aside>;
}

export default function LoadLightApp() {
  const [view, setView] = useState<AppView>('home');
  const [stored, setStored] = useState<StoredLoadLightState>(defaultStoredState);
  const [hydrated, setHydrated] = useState(false);
  const [enteringDashboard, setEnteringDashboard] = useState(false);
  const [composeSignal, setComposeSignal] = useState(0);
  const [toast, setToast] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  useEffect(() => { setStored(loadStoredState()); setHydrated(true); }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('demo=1')) {
      setDemoOpen(true);
      setDemoStep(0);
      setView('home');
    }
  }, []);
  useEffect(() => {
    if (!enteringDashboard) return;
    const timeout = window.setTimeout(() => setEnteringDashboard(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [enteringDashboard]);
  function persist(next: StoredLoadLightState, message = '') { setStored(next); saveStoredState(next); if (message) { setToast(message); window.setTimeout(() => setToast(''), 2600); } }
  function login(email: string) { setView('home'); setEnteringDashboard(true); persist({ ...stored, isLoggedIn: true, email }, 'Welcome back, Mia.'); }
  function logout() { setEnteringDashboard(false); persist({ ...stored, isLoggedIn: false }, 'You’re safely logged out.'); setView('home'); }
  function composeToday() { setView('home'); setComposeSignal((signal) => signal + 1); }
  const currentLoadPercent = Math.min(120, Math.round(activeWeekTaskLoad(stored.tasks ?? [])));
  function startDemo() { setDemoOpen(true); setDemoStep(0); setView(demoSteps[0].view); }
  function nextDemoStep() {
    if (demoStep >= demoSteps.length - 1) {
      setDemoOpen(false);
      setToast('Demo complete. Ready for questions.');
      window.setTimeout(() => setToast(''), 2600);
      return;
    }
    const nextStep = demoStep + 1;
    setDemoStep(nextStep);
    setView(demoSteps[nextStep].view);
  }
  if (!hydrated) return <main className="loading-page"><span>✦</span><p>Making a little room…</p></main>;
  if (!stored.isLoggedIn) return <LoginView onLogin={login} />;
  if (enteringDashboard) return <DashboardLoadingView />;
  return <main className="app-shell"><section className={`phone-frame ${view === 'balance' ? '' : 'with-app-topbar'}`} aria-label="LoadLight student workload manager">
    {view !== 'balance' && <AppTopBar title={topBarTitles[view]} onCompose={composeToday} showCompose={view === 'home'} />}
    {view === 'home' && <HomeView currentLoad={currentLoadPercent} stored={stored} onSave={persist} onNavigate={setView} composeSignal={composeSignal} onConsumeCompose={() => setComposeSignal(0)} />}{view === 'tasks' && <TasksView stored={stored} onSave={persist} />}{view === 'what-if' && <WhatIfView currentLoad={currentLoadPercent} stored={stored} onSave={persist} />}{view === 'balance' && <BalanceView stored={stored} onSave={persist} />}{view === 'me' && <MeView stored={stored} onSave={persist} onLogout={logout} />}
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ id, label, icon: Icon, featured }) => <Button key={id} variant="ghost" className={`${view === id ? 'active' : ''} ${featured ? 'featured' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}><Icon /><span>{label}</span></Button>)}</nav>
    <SupportChat />
    {demoOpen && <DemoGuide activeStep={demoStep} onClose={() => setDemoOpen(false)} onNext={nextDemoStep} onStart={startDemo} />}
    {toast && <output className="toast" aria-live="polite"><Check /> {toast}</output>}
  </section><aside className="desktop-note" aria-hidden="true"><span>✦</span><p><strong>LoadLight</strong><small>Lighten your load.</small></p></aside></main>;
}
