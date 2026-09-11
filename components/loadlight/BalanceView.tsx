'use client';

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Brain, Check, Coffee, Copy, Moon, PenLine, Scale, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  activeWeekTasks,
  activeWeekTaskLoad,
  addDaysISO,
  DEFAULT_WORKLOAD_WEEK_ANCHOR,
  taskLoadPoints,
  workloadWeekRange,
} from '@/lib/loadlight/load-logic';
import type { BalanceMove, StoredLoadLightState, Task } from '@/lib/loadlight/types';

type BalanceTool = 'balance' | 'care' | 'community' | 'breathing' | 'more';
type CalmGame = 'breath' | 'muyu' | 'bubble-pop';
type CommunityTopic = 'for-you' | 'study' | 'tree-hole' | 'wins';
type BalanceDecision = 'move' | 'keep' | 'drop';
type BalanceMode = 'rebalance' | 'recover' | 'reflect' | 'boundary';
type RecoveryChoice = 'screen' | 'stretch' | 'mute';
type BoundaryTone = 'soft' | 'firm' | 'short';
type ReflectReason = 'guilt' | 'deadline' | 'people' | 'unclear';
type BalanceScope = 'week';

const communityTopics: Array<{ id: CommunityTopic; label: string }> = [
  { id: 'for-you', label: 'For you' },
  { id: 'study', label: 'Study' },
  { id: 'tree-hole', label: 'Tree hole' },
  { id: 'wins', label: 'Wins' },
];

const recoveryOptions: Record<RecoveryChoice, { title: string; note: string; seconds: number }> = {
  screen: { title: '10 min off-screen', note: 'Look away from work and let your brain cool down.', seconds: 600 },
  stretch: { title: 'Stretch + water', note: 'Good when the overload feels physical.', seconds: 180 },
  mute: { title: 'Mute chats', note: 'Protect one quiet focus block.', seconds: 1500 },
};

const reflectionReasons: Record<ReflectReason, { label: string; prompt: string; advice: string }> = {
  guilt: {
    label: 'I feel guilty',
    prompt: 'What am I afraid people will think if I rest or say no?',
    advice: 'This sounds like guilt, not true capacity. Try making the task smaller before you make yourself carry all of it.',
  },
  deadline: {
    label: 'Deadline panic',
    prompt: 'What part is actually due first?',
    advice: 'Turn the pressure into one tiny next action. Start with the part that is due first, not the whole scary task.',
  },
  people: {
    label: 'People pressure',
    prompt: 'What do I wish I could say honestly?',
    advice: 'You may need a boundary, not a better schedule. Say what you can do, and name what you cannot carry today.',
  },
  unclear: {
    label: 'I feel messy',
    prompt: 'What is the one thing I can control in the next 10 minutes?',
    advice: 'When everything feels messy, do not solve the whole picture. Pick one controllable action and let that be enough for now.',
  },
};

const boundaryMessages: Record<BoundaryTone, string> = {
  soft: 'I want to do this properly, but my capacity is full today. Can I move this to tomorrow or take a smaller part instead?',
  firm: 'I cannot take this on today. My current load is full, so I need to protect the commitments I already have.',
  short: 'I am at capacity today. Can we move this to tomorrow?',
};

function nextWeekISO(date: string) {
  return date ? addDaysISO(date, 7) : date;
}

function dayLabel(date: string, fallback: string) {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(parsed);
}

function nextWeekDayLabel(date: string) {
  return `Next ${dayLabel(date, 'week')}`;
}

function buildBalanceMoves(tasks: Task[], activeDate: string, scope: BalanceScope): BalanceMove[] {
  return activeWeekTasks(tasks, activeDate)
    .sort((a, b) => taskLoadPoints(b) - taskLoadPoints(a))
    .map((task) => {
      const fromDate = task.scheduledDate || task.date || task.weekStart || activeDate;
      const toDate = task.flexibility === 'flexible' ? nextWeekISO(fromDate) : fromDate;
      const points = taskLoadPoints(task);
      return {
        taskId: task.id,
        title: task.title,
        fromDate,
        fromDayLabel: dayLabel(fromDate, 'Today'),
        toDate,
        toDayLabel: task.flexibility === 'flexible' ? nextWeekDayLabel(toDate) : dayLabel(fromDate, 'Today'),
        reason: task.flexibility === 'flexible' ? 'Flexible task; moving it to next week reduces this week’s load.' : 'Fixed task; keep it unless you decide it can be dropped.',
        relocatedPoints: points,
      };
    });
}

function balanceLoadCopy(load: number, loadLimit: number, scope: BalanceScope) {
  const label = 'The week';
  if (load > loadLimit) {
    return {
      title: `${label} is overloaded.`,
      consequence: `${label} is too full.`,
      help: `need to be reduced to get back under ${loadLimit}%.`,
    };
  }
  if (load >= loadLimit - 15) {
    return {
      title: `${label} is getting full.`,
      consequence: `${label} is close to the limit.`,
      help: 'can be moved or dropped if you want more breathing room.',
    };
  }
  return {
    title: `${label} has room.`,
    consequence: `${label} still feels manageable.`,
    help: 'can be moved or dropped if you want an even lighter week.',
  };
}

export function BalanceView({ stored, onSave }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const balancePlanRef = useRef<HTMLElement | null>(null);
  const anchorDate = DEFAULT_WORKLOAD_WEEK_ANCHOR;
  const balanceScope: BalanceScope = 'week';
  const [balanceStarted, setBalanceStarted] = useState(false);
  const weekLoad = useMemo(() => {
    return Math.min(120, Math.round(activeWeekTaskLoad(stored.tasks ?? [], anchorDate)));
  }, [stored.tasks, anchorDate]);
  const displayedLoad = weekLoad;
  const loadLimit = stored.loadLimit ?? 100;
  const balanceMoves = useMemo(() => buildBalanceMoves(stored.tasks ?? [], anchorDate, balanceScope), [stored.tasks, anchorDate, balanceScope]);
  const relocatedLoad = balanceMoves.reduce((total, move) => total + move.relocatedPoints, 0);
  const autoPlan = useMemo(() => {
    let remaining = Math.max(0, displayedLoad - loadLimit);
    const decisions: Record<string, BalanceDecision> = {};
    balanceMoves.forEach((move) => {
      if (remaining > 0) {
        decisions[move.taskId] = 'move';
        remaining -= move.relocatedPoints;
      } else {
        decisions[move.taskId] = 'keep';
      }
    });
    return decisions;
  }, [balanceMoves, displayedLoad, loadLimit]);
  const [taskDecisions, setTaskDecisions] = useState<Record<string, BalanceDecision>>({});
  const [activeTool, setActiveTool] = useState<BalanceTool>('balance');
  const [activeBalanceMode, setActiveBalanceMode] = useState<BalanceMode>('rebalance');
  const [toolSearch, setToolSearch] = useState('');
  const [activeGame, setActiveGame] = useState<CalmGame | null>(null);
  const [breathRounds, setBreathRounds] = useState(0);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathSeconds, setBreathSeconds] = useState(12);
  const [muyuCount, setMuyuCount] = useState(0);
  const [muyuPulse, setMuyuPulse] = useState(false);
  const [poppedBubbles, setPoppedBubbles] = useState<Set<number>>(new Set());
  const [communityText, setCommunityText] = useState('');
  const [communityTopic, setCommunityTopic] = useState<CommunityTopic>('for-you');
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [recoveryChoice, setRecoveryChoice] = useState<RecoveryChoice | null>(null);
  const [recoverySeconds, setRecoverySeconds] = useState(0);
  const [recoveryRunning, setRecoveryRunning] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [reflectReason, setReflectReason] = useState<ReflectReason | null>(null);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [savedReflection, setSavedReflection] = useState('');
  const [reflectionAdvice, setReflectionAdvice] = useState('');
  const [boundaryTone, setBoundaryTone] = useState<BoundaryTone>('soft');
  const [boundaryProblem, setBoundaryProblem] = useState('');
  const [boundaryMessage, setBoundaryMessage] = useState('');
  const [boundaryReplies, setBoundaryReplies] = useState<Partial<Record<BoundaryTone, string>>>({});
  const [boundaryGenerated, setBoundaryGenerated] = useState(false);
  const [boundaryGenerating, setBoundaryGenerating] = useState(false);
  const [boundaryCopied, setBoundaryCopied] = useState(false);
  const [showAutoPlan, setShowAutoPlan] = useState(false);
  const [communityPosts, setCommunityPosts] = useState([
    { id: 'mia', name: 'Mia', topic: 'study' as CommunityTopic, tag: 'Report room', text: 'Trying to finish my report without panicking. Taking it one paragraph at a time.', replies: ['Same here. I am doing the intro first.'], cares: 8 },
    { id: 'lumi-room', name: 'Lumi room', topic: 'for-you' as CommunityTopic, tag: 'Focus together', text: '3 people are doing a 25-minute focus block now. Join quietly, no pressure to talk.', replies: ['Starting in 2 minutes.'], cares: 12 },
    { id: 'nina', name: 'Nina', topic: 'wins' as CommunityTopic, tag: 'Tiny win', text: 'I moved one task instead of blaming myself. Small but honestly huge.', replies: ['Proud of this kind of move.'], cares: 6 },
    { id: 'anon', name: 'Anon', topic: 'tree-hole' as CommunityTopic, tag: 'Tree hole', text: 'I feel behind, but I am trying not to disappear from everything.', replies: ['You are not behind as a person. Just start with one message.'], cares: 10 },
  ]);
  useEffect(() => {
    setTaskDecisions((current) => Object.fromEntries(balanceMoves.map((move) => [move.taskId, current[move.taskId] ?? 'keep'])) as Record<string, BalanceDecision>);
  }, [balanceMoves]);

  const relievedPoints = balanceMoves.reduce(
    (total, move) => total + (taskDecisions[move.taskId] !== 'keep' ? move.relocatedPoints : 0),
    0,
  );
  const targetReduction = displayedLoad > loadLimit ? displayedLoad - loadLimit : 0;
  const remainingPoints = Math.max(0, targetReduction - relievedPoints);
  const projectedLoad = displayedLoad;
  const balancedLoad = projectedLoad - relievedPoints;
  const progressTarget = targetReduction || relocatedLoad;
  const loadCopy = balanceLoadCopy(displayedLoad, loadLimit, balanceScope);
  const needsBalance = displayedLoad > loadLimit;
  const showBalanceSteps = balanceMoves.length > 0;
  const mostStressfulTask = balanceMoves[0];

  function setTaskDecision(taskId: string, decision: BalanceDecision) {
    setTaskDecisions((current) => ({ ...current, [taskId]: decision }));
  }

  function chooseRecovery(choice: RecoveryChoice) {
    setRecoveryChoice(choice);
    setRecoverySeconds(recoveryOptions[choice].seconds);
    setRecoveryRunning(false);
    setRecoveryDone(false);
  }

  function startRecovery() {
    if (!recoveryChoice) return;
    if (recoverySeconds <= 0) setRecoverySeconds(recoveryOptions[recoveryChoice].seconds);
    setRecoveryDone(false);
    setRecoveryRunning(true);
  }

  function saveReflection() {
    const answer = reflectionAnswer.trim();
    if (!answer) return;
    setSavedReflection(answer);
    setReflectionAdvice(reflectReason ? reflectionReasons[reflectReason].advice : 'Start with one honest sentence. That is already a lighter next step.');
  }

  function chooseBoundaryTone(tone: BoundaryTone) {
    setBoundaryTone(tone);
    if (boundaryGenerated) setBoundaryMessage(boundaryReplies[tone] ?? makeBoundaryReply(tone, boundaryProblem));
    setBoundaryCopied(false);
  }

  function makeBoundaryReply(tone: BoundaryTone, problem: string) {
    const cleanProblem = problem.trim();
    const context = cleanProblem ? `About ${cleanProblem}, ` : '';
    if (tone === 'firm') return `${context}I cannot take this on today. My current load is full, so I need to protect the commitments I already have.`;
    if (tone === 'short') return `${context}I am at capacity today. Can we move this to tomorrow?`;
    return `${context}I want to do this properly, but my capacity is full today. Can I move this to tomorrow or take a smaller part instead?`;
  }

  async function generateBoundaryReply() {
    const problem = boundaryProblem.trim();
    if (!problem) {
      setBoundaryMessage('Tell Lumi what happened first, then generate a reply.');
      setBoundaryReplies({ soft: 'Tell Lumi what happened first, then generate a reply.' });
      setBoundaryGenerated(true);
      return;
    }

    setBoundaryGenerating(true);
    setBoundaryCopied(false);
    try {
      const tones: BoundaryTone[] = ['soft', 'firm', 'short'];
      const results = await Promise.all(tones.map(async (tone) => {
        const response = await fetch('/api/lumi-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'boundary', tone, problem }),
        });
        const data = (await response.json()) as { reply?: string };
        return [tone, data.reply?.trim() || makeBoundaryReply(tone, problem)] as const;
      }));
      const nextReplies = Object.fromEntries(results) as Record<BoundaryTone, string>;
      setBoundaryReplies(nextReplies);
      setBoundaryMessage(nextReplies[boundaryTone]);
    } catch {
      const nextReplies: Record<BoundaryTone, string> = {
        soft: makeBoundaryReply('soft', problem),
        firm: makeBoundaryReply('firm', problem),
        short: makeBoundaryReply('short', problem),
      };
      setBoundaryReplies(nextReplies);
      setBoundaryMessage(nextReplies[boundaryTone]);
    }
    setBoundaryGenerated(true);
    setBoundaryGenerating(false);
  }

  function saveBalanceChoice(decisions: Record<string, BalanceDecision> = taskDecisions) {
    const nextTasks = (stored.tasks ?? []).map((task) => {
      const decision = decisions[task.id];
      if (decision === 'drop') return { ...task, status: 'skipped' as const };
      if (decision === 'move') {
        const currentDate = task.scheduledDate || task.date || anchorDate;
        const nextWeekDate = nextWeekISO(currentDate);
        const nextWeek = workloadWeekRange(nextWeekDate);
        return {
          ...task,
          scheduledDate: nextWeekDate,
          weekStart: nextWeek.start,
          weekEnd: nextWeek.end,
          autoScheduled: false,
        };
      }
      return task;
    });
    onSave({ ...stored, tasks: nextTasks }, 'Balance choices saved.');
  }

  function confirmAutoPlan() {
    setTaskDecisions(autoPlan);
    setShowAutoPlan(false);
    saveBalanceChoice(autoPlan);
  }

  function adjustAutoPlan() {
    setShowAutoPlan(false);
    window.setTimeout(() => balancePlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  const breathPhase = breathSeconds > 8 ? 'Inhale' : breathSeconds > 6 ? 'Hold' : breathSeconds > 0 ? 'Exhale' : 'Done';
  const visibleCommunityPosts = communityTopic === 'for-you' ? communityPosts : communityPosts.filter((post) => post.topic === communityTopic);
  const recoveryProgress = recoveryChoice ? Math.round((1 - recoverySeconds / recoveryOptions[recoveryChoice].seconds) * 100) : 0;
  const recoveryTimer = `${Math.floor(recoverySeconds / 60)}:${String(recoverySeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (!breathRunning) return;
    if (breathSeconds <= 0) {
      setBreathRunning(false);
      setBreathRounds((rounds) => rounds + 1);
      return;
    }
    const timer = window.setTimeout(() => setBreathSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [breathRunning, breathSeconds]);

  useEffect(() => {
    if (!recoveryRunning) return;
    if (recoverySeconds <= 0) {
      setRecoveryRunning(false);
      setRecoveryDone(true);
      return;
    }
    const timer = window.setTimeout(() => setRecoverySeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [recoveryRunning, recoverySeconds]);

  function startBreath() {
    setBreathSeconds(12);
    setBreathRunning(true);
  }

  function tapMuyu() {
    setMuyuCount((count) => count + 1);
    setMuyuPulse(true);
    playMuyuSound();
    window.setTimeout(() => setMuyuPulse(false), 120);
  }

  function playMuyuSound() {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(185, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(92, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  }

  function popBubble(index: number) {
    setPoppedBubbles((current) => new Set(current).add(index));
  }

  function addCommunityPost() {
    const text = communityText.trim();
    if (!text) return;
    setCommunityPosts((posts) => [
      { id: `post-${posts.length + 1}-${text.length}`, name: 'You', topic: communityTopic, tag: communityTopics.find((topic) => topic.id === communityTopic)?.label ?? 'Just now', text, replies: ['Lumi: I hear you. Pick one tiny next step first.'], cares: 1 },
      ...posts,
    ]);
    setCommunityText('');
  }

  function addCare(postId: string) {
    setCommunityPosts((posts) => posts.map((post) => post.id === postId ? { ...post, cares: post.cares + 1 } : post));
  }

  function sendReply(postId: string) {
    const text = replyText.trim();
    if (!text) return;
    setCommunityPosts((posts) => posts.map((post) => post.id === postId ? { ...post, replies: [...post.replies, `You: ${text}`] } : post));
    setReplyText('');
    setReplyingPostId(null);
  }

  function copyBoundaryMessage() {
    void navigator.clipboard?.writeText(boundaryMessage);
    setBoundaryCopied(true);
    window.setTimeout(() => setBoundaryCopied(false), 1600);
  }

  function runToolSearch(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    if (['recover', 'recovery', 'reset', 'break', 'rest', 'care', 'stress'].some((word) => normalized.includes(word))) {
      setActiveTool('care');
      setActiveBalanceMode('recover');
      return;
    }
    if (['reflect', 'why', 'pressure', 'guilt', 'deadline'].some((word) => normalized.includes(word))) {
      setActiveTool('care');
      setActiveBalanceMode('reflect');
      return;
    }
    if (['boundary', 'reply', 'say no', 'message'].some((word) => normalized.includes(word))) {
      setActiveTool('care');
      setActiveBalanceMode('boundary');
      return;
    }
    if (['community', 'friend', 'chat', 'post', 'room'].some((word) => normalized.includes(word))) {
      setActiveTool('community');
      return;
    }
    if (['game', 'breath', 'breathe', 'bubble', 'wooden', 'fish', 'muyu'].some((word) => normalized.includes(word))) {
      setActiveTool('breathing');
      return;
    }
    if (['balance', 'move', 'drop', 'keep', 'overload', 'task'].some((word) => normalized.includes(word))) {
      setActiveTool('balance');
      setActiveBalanceMode('rebalance');
    }
  }

  return <div className="view-content balance-view">
    <section className="balance-community-strip" aria-label="Community shortcuts">
      <div className="community-search-row">
        <label className="community-search">
          <Search aria-hidden="true" />
          <input
            value={toolSearch}
            onChange={(event) => {
              setToolSearch(event.target.value);
              runToolSearch(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runToolSearch(toolSearch);
            }}
            placeholder="Search tools, care, games..."
          />
        </label>
      </div>
      <div className="community-nav" aria-label="Community categories">
        <button className={activeTool === 'balance' && activeBalanceMode === 'rebalance' ? 'active' : ''} type="button" onClick={() => { setActiveTool('balance'); setActiveBalanceMode('rebalance'); }}>Balance</button>
        <button className={activeTool === 'care' ? 'active' : ''} type="button" onClick={() => { setActiveTool('care'); setActiveBalanceMode('recover'); }}>Care</button>
        <button className={activeTool === 'community' ? 'active' : ''} type="button" onClick={() => setActiveTool('community')}>Community</button>
        <button className={activeTool === 'breathing' ? 'active' : ''} type="button" onClick={() => setActiveTool('breathing')}>Mini game</button>
        <button className={activeTool === 'more' ? 'active' : ''} type="button" onClick={() => setActiveTool('more')}>...</button>
      </div>
    </section>

    {(activeTool === 'balance' || activeTool === 'care') && <>
      <header className="page-header balance-work-title">
        <p className="date-label">{activeTool === 'care' ? 'CARE' : 'BALANCE'}</p>
        <h1>{activeBalanceMode === 'rebalance' ? loadCopy.title : activeBalanceMode === 'recover' ? 'Take care first.' : activeBalanceMode === 'reflect' ? 'Why am I stressed?' : 'Set a boundary.'}</h1>
        <p>{activeBalanceMode === 'rebalance' ? `${displayedLoad}% week load from your current tasks. Move, keep, or drop until it feels lighter.` : activeBalanceMode === 'recover' ? 'Pick a reset, find the pressure, or prepare a calmer reply.' : activeBalanceMode === 'reflect' ? 'Find the real reason first, then choose the right next step.' : 'Copy a kind reply when you need to protect your capacity.'}</p>
      </header>

      {activeTool === 'care' && <section className="care-mode-tabs" aria-label="Care tools">
        <button type="button" className={activeBalanceMode === 'recover' ? 'active' : ''} onClick={() => setActiveBalanceMode('recover')}><Moon />Recovery</button>
        <button type="button" className={activeBalanceMode === 'reflect' ? 'active' : ''} onClick={() => setActiveBalanceMode('reflect')}><Brain />Reflect</button>
        <button type="button" className={activeBalanceMode === 'boundary' ? 'active' : ''} onClick={() => setActiveBalanceMode('boundary')}><ShieldCheck />Boundary</button>
      </section>}

      {activeTool === 'balance' && activeBalanceMode === 'rebalance' && <>
      <div className="balance-simple-flow" aria-label="Balance workflow">
        {!showBalanceSteps && <section className="balance-not-needed" aria-labelledby="balance-not-needed-title">
          <span className="balance-step">1</span>
          <div>
            <span className="micro-label">WEEK LOAD</span>
            <h2 id="balance-not-needed-title">{displayedLoad >= loadLimit - 15 ? 'This week is close to the limit.' : 'This week is manageable.'}</h2>
            <div className="balance-optional-load" aria-label={`${displayedLoad} percent load`}>
              <span>Current load</span>
              <strong>{displayedLoad}<small>%</small></strong>
            </div>
            <p>Not overloaded yet. Keep it as it is, or balance anyway if you want more breathing room.</p>
          </div>
          <div className="balance-choice-actions">
            <Button type="button" variant="outline" onClick={() => setBalanceStarted(false)}>Keep as is</Button>
            <Button type="button" className="primary-action" onClick={() => setBalanceStarted(true)}>Balance anyway</Button>
          </div>
        </section>}

        {showBalanceSteps && <><section className="balance-commitment" aria-labelledby="commitment-title">
          <span className="balance-step">1</span>
          <span className="balance-icon" aria-hidden="true"><Coffee /></span>
          <div>
            <span className="micro-label">HEAVIEST LOAD</span>
            <h2 id="commitment-title">{mostStressfulTask?.title ?? 'No open tasks right now'}</h2>
            <p>{mostStressfulTask ? `This task takes the most space: ${mostStressfulTask.relocatedPoints} load points.` : 'Add tasks first, then Lumi can spot what feels heaviest.'}</p>
          </div>
        </section>

        <section className="balance-consequence" aria-labelledby="consequence-title">
          <span className="balance-step">2</span>
          <h2 id="consequence-title">{loadCopy.consequence}</h2>
          <div className="balance-loads" aria-label={`Load changes from ${displayedLoad} to ${balancedLoad} percent`}>
            <div><span>Now</span><strong>{displayedLoad}</strong></div>
            <ArrowRight aria-hidden="true" />
            <div className="what-if-total"><span>After choices</span><strong>{balancedLoad}</strong></div>
          </div>
          <p className="balance-needed">
            <strong>{targetReduction} points</strong>
            <span>{targetReduction ? loadCopy.help : 'need to be reduced. You can still balance anyway for more breathing room.'}</span>
          </p>
        </section>

        <section className="balance-options balance-plan-card" aria-labelledby="balance-options-title" ref={balancePlanRef}>
          <span className="balance-step">3</span>
          <div className="rescue-heading">
            <div>
              <h2 id="balance-options-title">Decide task by task.</h2>
              <p className="balance-intro">Lumi suggests a calmer option, but you choose what happens.</p>
            </div>
            <span>{targetReduction ? `${relievedPoints}/${targetReduction}` : 'optional'}</span>
          </div>
          <Button type="button" variant="outline" className="auto-plan-button" onClick={() => setShowAutoPlan(true)}><Sparkles /> AI auto plan</Button>
          <div className="rescue-progress"><i style={{ width: `${Math.min(100, progressTarget ? (relievedPoints / progressTarget) * 100 : 0)}%` }} /></div>
          <p className="balance-intro">You do not need to fix everything. Keeping something is allowed; Lumi will just show the trade-off.</p>
          <div className="rescue-task-list">
            {balanceMoves.length ? balanceMoves.map((move) => {
              const decision = taskDecisions[move.taskId] ?? 'keep';
              return <article className={`rescue-task-card ${decision}`} key={move.taskId}>
                <span className="task-check" aria-hidden="true">{decision !== 'keep' ? <Check /> : null}</span>
                <span className="rescue-task-copy">
                  <strong>{move.title}</strong>
                  <span className="balance-route">{decision === 'move' ? <>{move.fromDayLabel} <ArrowRight aria-hidden="true" /> {move.toDayLabel} <i aria-hidden="true">·</i> -{move.relocatedPoints} load</> : decision === 'drop' ? <>Remove from this week <i aria-hidden="true">·</i> -{move.relocatedPoints} load</> : <>Keep in this week <i aria-hidden="true">·</i> no load reduced</>}</span>
                  <small>{decision === 'move' ? 'Move it out of this week' : decision === 'drop' ? 'Drop it if it is not worth carrying' : 'Keep it because it still matters this week'}</small>
                </span>
                <span className="decision-actions" aria-label={`Decision for ${move.title}`}>
                  <button title="Move to next week" className={decision === 'move' ? 'active' : ''} type="button" onClick={() => setTaskDecision(move.taskId, 'move')}>Move</button>
                  <button className={decision === 'keep' ? 'active' : ''} type="button" onClick={() => setTaskDecision(move.taskId, 'keep')}>Keep</button>
                  <button className={decision === 'drop' ? 'active danger' : 'danger'} type="button" onClick={() => setTaskDecision(move.taskId, 'drop')}>Drop</button>
                </span>
              </article>;
            }) : <p className="empty-scenario-note">Nothing open right now. Add tasks first, then Balance can help you adjust them.</p>}
          </div>
        </section>

        <section className="balance-action-area" aria-label="Balance plan summary">
          <div>
            <span>Result</span>
            <strong>Week becomes {balancedLoad}%</strong>
            <p>{remainingPoints > 0 ? `Still ${remainingPoints} points over. You can keep it if that is the honest choice.` : 'Back in balance. Nothing is forced.'}</p>
          </div>
          <Button className="primary-action" onClick={() => saveBalanceChoice()} disabled={!balanceMoves.length}><Scale /> Save my choice</Button>
        </section>
        </>}
      </div>
      </>}

      {activeTool === 'care' && activeBalanceMode === 'recover' && <section className="balance-intervention-card" aria-labelledby="recover-title">
        <span className="intervention-icon"><Moon /></span>
        <div><p className="micro-label">RECOVER</p><h2 id="recover-title">Pick one reset now.</h2><p>Not a full self-care routine. Just one thing that makes the next hour lighter.</p></div>
        <div className="recovery-choice-row recovery-list">
          {(Object.keys(recoveryOptions) as RecoveryChoice[]).map((choice) => <button className={recoveryChoice === choice ? 'active' : ''} type="button" key={choice} onClick={() => chooseRecovery(choice)}><strong>{recoveryOptions[choice].title}</strong><span>{recoveryOptions[choice].note}</span></button>)}
        </div>
        {recoveryChoice && <div className="recovery-player">
          <div className="recovery-ring" style={{ '--progress': `${recoveryProgress}%` } as CSSProperties}><strong>{recoveryDone ? 'Done' : recoveryTimer}</strong><span>{recoveryOptions[recoveryChoice].title}</span></div>
          <div className="recovery-controls">
            <Button type="button" className="primary-action" onClick={startRecovery} disabled={recoveryRunning}>{recoveryRunning ? 'Running...' : recoveryDone ? 'Restart' : 'Start reset'}</Button>
            <Button type="button" variant="outline" onClick={() => { setRecoveryRunning(false); setRecoverySeconds(recoveryOptions[recoveryChoice].seconds); setRecoveryDone(false); }}>Reset</Button>
          </div>
          <p className="tool-feedback">{recoveryDone ? 'Nice. You gave your body a small pause.' : 'Stay with this one reset. Nothing else to solve right now.'}</p>
        </div>}
      </section>}

      {activeTool === 'care' && activeBalanceMode === 'reflect' && <section className="balance-intervention-card" aria-labelledby="reflect-title">
        <span className="intervention-icon"><Brain /></span>
        <div><p className="micro-label">STRESS REASON</p><h2 id="reflect-title">What is causing the pressure?</h2><p>This helps Lumi suggest the right type of help: move a task, take a break, or set a boundary.</p></div>
        <div className="reflect-step-label"><span>1</span><strong>Pick what this feels like</strong></div>
        <div className="reflection-prompts reflect-reason-grid">
          {(Object.keys(reflectionReasons) as ReflectReason[]).map((reason) => <button className={reflectReason === reason ? 'active' : ''} type="button" key={reason} onClick={() => { setReflectReason(reason); setReflectionAnswer(''); setSavedReflection(''); setReflectionAdvice(''); }}>{reflectionReasons[reason].label}</button>)}
        </div>
        {reflectReason && <>
          <div className="reflect-step-label"><span>2</span><strong>Answer one small question</strong></div>
          <div className="reflection-question-card">
            <p>Lumi asks</p>
            <strong>{reflectionReasons[reflectReason].prompt}</strong>
            <textarea aria-label="Reflection answer" value={reflectionAnswer} onChange={(event) => setReflectionAnswer(event.target.value)} placeholder="Type your answer here..." />
          </div>
          <Button type="button" className="primary-action" disabled={!reflectionAnswer.trim()} onClick={saveReflection}><Check /> Get suggestion</Button>
        </>}
        {savedReflection && <div className="reflection-result-card">
          <span>Your answer</span>
          <p>“{savedReflection}”</p>
          <strong>{reflectionAdvice}</strong>
        </div>}
      </section>}

      {activeTool === 'care' && activeBalanceMode === 'boundary' && <section className="balance-intervention-card boundary-card" aria-labelledby="boundary-title">
        <span className="intervention-icon"><ShieldCheck /></span>
        <div><p className="micro-label">BOUNDARY</p><h2 id="boundary-title">Send a calmer reply.</h2><p>Use this when you want to be kind but still protect your capacity.</p></div>
        <label className="boundary-problem-box">
          <span>What happened?</span>
          <textarea aria-label="What happened?" value={boundaryProblem} onChange={(event) => setBoundaryProblem(event.target.value)} placeholder="e.g. My teammate asked me to join another meeting tonight..." />
        </label>
        <div className={`boundary-tone-row ${boundaryGenerated ? 'has-replies' : ''}`} role="group" aria-label="Boundary reply tone">
          <button className={boundaryTone === 'soft' ? 'active' : ''} type="button" onClick={() => chooseBoundaryTone('soft')}>Soft</button>
          <button className={boundaryTone === 'firm' ? 'active' : ''} type="button" onClick={() => chooseBoundaryTone('firm')}>Firm</button>
          <button className={boundaryTone === 'short' ? 'active' : ''} type="button" onClick={() => chooseBoundaryTone('short')}>Short</button>
        </div>
        <Button type="button" variant="outline" className="generate-boundary-button" onClick={generateBoundaryReply} disabled={boundaryGenerating}><Sparkles /> {boundaryGenerating ? 'Writing...' : 'Generate reply'}</Button>
        {boundaryGenerated && <>
          <div className="boundary-answer-card">
            <span>{boundaryTone} reply</span>
            <textarea className="boundary-message-box" value={boundaryMessage} onChange={(event) => { const next = event.target.value; setBoundaryMessage(next); setBoundaryReplies((current) => ({ ...current, [boundaryTone]: next })); setBoundaryCopied(false); }} aria-label="Boundary message" />
          </div>
          <Button type="button" className="primary-action" onClick={copyBoundaryMessage}><Copy /> {boundaryCopied ? 'Copied' : 'Copy reply'}</Button>
        </>}
      </section>}

      {showAutoPlan && <div className="auto-plan-overlay" role="dialog" aria-modal="true" aria-labelledby="auto-plan-title">
        <section className="auto-plan-dialog">
          <button className="auto-plan-close" type="button" aria-label="Close AI auto plan" onClick={() => setShowAutoPlan(false)}><X /></button>
          <span className="micro-label">LUMI SUGGESTS</span>
          <h2 id="auto-plan-title">Use this plan?</h2>
          <p>Nothing changes yet. Confirm only if this feels right.</p>
          <div className="auto-plan-list">
            {balanceMoves.map((move) => {
              const decision = autoPlan[move.taskId];
              return <div className={`auto-plan-row ${decision}`} key={move.taskId}>
                <strong>{decision === 'move' ? 'Move' : decision === 'drop' ? 'Drop' : 'Keep'}</strong>
                <span>{move.title}</span>
                <small>{decision === 'move' ? `${move.fromDayLabel} to next week` : decision === 'drop' ? 'Remove from this week' : 'Keep in this week'}</small>
              </div>;
            })}
          </div>
          <div className="auto-plan-actions">
            <Button type="button" variant="outline" onClick={() => setShowAutoPlan(false)}>Cancel</Button>
            <Button type="button" variant="outline" onClick={adjustAutoPlan}>Adjust</Button>
            <Button type="button" className="primary-action" onClick={confirmAutoPlan}><Check /> Confirm plan</Button>
          </div>
        </section>
      </div>}
    </>}

    {activeTool === 'community' && <section className="balance-tool-panel community-panel" aria-labelledby="community-panel-title">
      <span className="panel-kicker">COMMUNITY</span>
      <h1 id="community-panel-title">Talk with people who get it.</h1>
      <p>Post a small thought, send care, or reply softly. Prototype messages stay on this screen.</p>
      <div className="community-topic-row" aria-label="Community topics">
        {communityTopics.map((topic) => <button className={communityTopic === topic.id ? 'active' : ''} type="button" key={topic.id} onClick={() => setCommunityTopic(topic.id)}>{topic.label}</button>)}
      </div>
      <div className="community-composer">
        <PenLine aria-hidden="true" />
        <input value={communityText} onChange={(event) => setCommunityText(event.target.value)} placeholder="What feels heavy today?" />
        <button type="button" onClick={addCommunityPost}>Post</button>
      </div>
      <div className="community-feed">
        {visibleCommunityPosts.map((post) => <article key={post.id}>
          <div className="community-post-head"><span>{post.name.slice(0, 1)}</span><div><strong>{post.name}</strong><small>{post.tag}</small></div></div>
          <p>{post.text}</p>
          <div className="community-replies">{post.replies.map((reply) => <small key={reply}>{reply}</small>)}</div>
          {replyingPostId === post.id && <div className="community-reply-box"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Write a soft reply..." /><button type="button" onClick={() => sendReply(post.id)}>Send</button></div>}
          <div className="community-post-actions">
            <button type="button" onClick={() => addCare(post.id)}>Send care · {post.cares}</button>
            <button type="button" onClick={() => setReplyingPostId(replyingPostId === post.id ? null : post.id)}>Reply</button>
            {post.id === 'lumi-room' && <button type="button" onClick={() => setJoinedRoom(true)}>{joinedRoom ? 'Joined' : 'Join room'}</button>}
          </div>
        </article>)}
      </div>
    </section>}

    {activeTool === 'breathing' && <section className="balance-tool-panel breathing-panel" aria-labelledby="breathing-title">
      <span className="panel-kicker">MINI GAME</span>
      {!activeGame && <>
        <h1 id="breathing-title">Choose a reset game.</h1>
        <p>Pick one small exercise. Each one takes less than two minutes.</p>
        <div className="game-menu" aria-label="Choose a calming game">
          <button type="button" onClick={() => setActiveGame('breath')}>
            <strong>Deep breath</strong>
            <span>Start a guided 12-second calm round.</span>
          </button>
          <button type="button" onClick={() => setActiveGame('muyu')}>
            <strong>Wooden fish</strong>
            <span>Tap, tap, tap. Empty brain for a while.</span>
          </button>
          <button type="button" onClick={() => setActiveGame('bubble-pop')}>
            <strong>Pop bubbles</strong>
            <span>Tap every bubble, then reset the board.</span>
          </button>
        </div>
      </>}

      {activeGame === 'breath' && <div className="game-stage breath-game">
        <button className="game-back" type="button" onClick={() => setActiveGame(null)}>Back to games</button>
        <h1>Deep breath.</h1>
        <p>Press start and follow Lumi's timer.</p>
        <div className={`breath-orb ${breathRunning ? 'running' : ''}`} aria-hidden="true"><span /></div>
        <div className="breath-timer"><strong>{breathPhase}</strong><span>{breathSeconds}s</span></div>
        <div className="breath-steps"><span>Inhale 4s</span><span>Hold 2s</span><span>Exhale 6s</span></div>
        <Button type="button" className="primary-action" onClick={startBreath} disabled={breathRunning}>{breathRunning ? 'Breathing...' : 'Start round'}</Button>
        <small>{breathRounds ? `${breathRounds} calm round${breathRounds > 1 ? 's' : ''} done` : 'Try one slow round.'}</small>
      </div>}

      {activeGame === 'muyu' && <div className="game-stage muyu-game">
        <button className="game-back" type="button" onClick={() => setActiveGame(null)}>Back to games</button>
        <h1>Wooden fish.</h1>
        <p>Tap the screen. It knocks back.</p>
        <button className={`muyu-button ${muyuPulse ? 'pulse' : ''}`} type="button" onClick={tapMuyu} aria-label="Tap wooden fish">
          <span className="muyu-plus" aria-hidden="true">Calm +1</span>
          <span className="muyu-body" aria-hidden="true"><i /></span>
        </button>
        <div className="muyu-count">
          <strong>{muyuCount}</strong>
          <span>tiny knocks</span>
        </div>
        <Button type="button" variant="outline" onClick={() => setMuyuCount(0)}>Start over</Button>
      </div>}

      {activeGame === 'bubble-pop' && <div className="game-stage bubble-pop-game">
        <button className="game-back" type="button" onClick={() => setActiveGame(null)}>Back to games</button>
        <h1>Pop bubbles.</h1>
        <p>No thinking. Just poke every soft bubble.</p>
        <div className="bubble-score"><strong>{poppedBubbles.size}/16</strong><span>popped</span></div>
        <div className="bubble-grid" aria-label="Bubble pop board">
          {Array.from({ length: 16 }, (_, index) => <button
            key={index}
            className={poppedBubbles.has(index) ? 'popped' : ''}
            type="button"
            onClick={() => popBubble(index)}
            aria-label={poppedBubbles.has(index) ? 'Popped bubble' : 'Pop bubble'}
          />)}
        </div>
        <Button type="button" variant="outline" onClick={() => setPoppedBubbles(new Set())}>Reset bubbles</Button>
      </div>}
    </section>}

    {activeTool === 'more' && <section className="balance-tool-panel more-panel" aria-labelledby="more-title">
      <span className="panel-kicker">COMING SOON</span>
      <h1 id="more-title">More gentle tools later.</h1>
      <p>This space is ready for future features, like friend check-ins, weekly challenges, or mood stickers.</p>
    </section>}
  </div>;
}
