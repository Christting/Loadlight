'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coffee, Mail, MessageCircleHeart, PenLine, Scale, Search, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { proposedCafeShift } from '@/lib/loadlight/demo-data';
import {
  balanceMoves,
  proposedShiftLoad,
  relocatedLoad,
  thursdayAfterWhatIf,
  thursdayBeforeLoad,
} from '@/lib/loadlight/load-logic';

type BalanceTool = 'balance' | 'community' | 'breathing' | 'more';
type CalmGame = 'breath' | 'muyu' | 'bubble-pop';
type CommunityTopic = 'for-you' | 'study' | 'tree-hole' | 'wins';

const communityTopics: Array<{ id: CommunityTopic; label: string }> = [
  { id: 'for-you', label: 'For you' },
  { id: 'study', label: 'Study' },
  { id: 'tree-hole', label: 'Tree hole' },
  { id: 'wins', label: 'Wins' },
];

export function BalanceView() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<BalanceTool>('balance');
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
  const [communityPosts, setCommunityPosts] = useState([
    { id: 'mia', name: 'Mia', topic: 'study' as CommunityTopic, tag: 'Report room', text: 'Trying to finish my report without panicking. Taking it one paragraph at a time.', replies: ['Same here. I am doing the intro first.'], cares: 8 },
    { id: 'lumi-room', name: 'Lumi room', topic: 'for-you' as CommunityTopic, tag: 'Focus together', text: '3 people are doing a 25-minute focus block now. Join quietly, no pressure to talk.', replies: ['Starting in 2 minutes.'], cares: 12 },
    { id: 'nina', name: 'Nina', topic: 'wins' as CommunityTopic, tag: 'Tiny win', text: 'I moved one task instead of blaming myself. Small but honestly huge.', replies: ['Proud of this kind of move.'], cares: 6 },
    { id: 'anon', name: 'Anon', topic: 'tree-hole' as CommunityTopic, tag: 'Tree hole', text: 'I feel behind, but I am trying not to disappear from everything.', replies: ['You are not behind as a person. Just start with one message.'], cares: 10 },
  ]);
  const selectedPoints = balanceMoves.reduce(
    (total, move) => total + (selectedTaskIds.has(move.taskId) ? move.relocatedPoints : 0),
    0,
  );
  const remainingPoints = relocatedLoad - selectedPoints;
  const canApply = selectedPoints >= relocatedLoad;

  function toggleMove(taskId: string) {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  const breathPhase = breathSeconds > 8 ? 'Inhale' : breathSeconds > 6 ? 'Hold' : breathSeconds > 0 ? 'Exhale' : 'Done';
  const visibleCommunityPosts = communityTopic === 'for-you' ? communityPosts : communityPosts.filter((post) => post.topic === communityTopic);

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

  return <div className="view-content balance-view">
    <section className="balance-community-strip" aria-label="Community shortcuts">
      <div className="community-search-row">
        <button type="button" aria-label="Inbox"><Mail /></button>
        <label className="community-search">
          <Search aria-hidden="true" />
          <span>Search calm tips, friends, games...</span>
        </label>
        <button type="button" aria-label="Profile"><UserCircle /></button>
      </div>
      <div className="community-nav" aria-label="Community categories">
        <button className={activeTool === 'balance' ? 'active' : ''} type="button" onClick={() => setActiveTool('balance')}>Balance</button>
        <button className={activeTool === 'community' ? 'active' : ''} type="button" onClick={() => setActiveTool('community')}>Community</button>
        <button className={activeTool === 'breathing' ? 'active' : ''} type="button" onClick={() => setActiveTool('breathing')}>Mini game</button>
        <button className={activeTool === 'more' ? 'active' : ''} type="button" onClick={() => setActiveTool('more')}>...</button>
      </div>
    </section>

    {activeTool === 'balance' && <>
      <header className="page-header balance-work-title"><p className="date-label">BALANCE</p><h1>Make a little room.</h1></header>

      <section className="balance-commitment" aria-labelledby="commitment-title">
        <span className="balance-icon" aria-hidden="true"><Coffee /></span>
        <div><span className="micro-label">NEW COMMITMENT</span><h2 id="commitment-title">{proposedCafeShift.title}</h2><p>Thursday <span aria-hidden="true">·</span> <strong>+{proposedShiftLoad} load</strong></p></div>
      </section>

      <section className="balance-consequence" aria-labelledby="consequence-title">
        <h2 id="consequence-title">Thursday load</h2>
        <div className="balance-loads" aria-label={`Thursday load changes from ${thursdayBeforeLoad} to ${thursdayAfterWhatIf} points`}>
          <div><span>Current</span><strong>{thursdayBeforeLoad}</strong></div>
          <ArrowRight aria-hidden="true" />
          <div className="what-if-total"><span>With shift</span><strong>{thursdayAfterWhatIf}</strong></div>
        </div>
        <p className="balance-needed"><strong>{relocatedLoad} points</strong><span>need to be moved</span></p>
      </section>

      <section className="balance-options" aria-labelledby="balance-options-title">
        <h2 id="balance-options-title">MAKE SOME ROOM</h2>
        <p className="balance-intro">Choose what to move from Thursday.</p>
        <div className="balance-move-list">
          {balanceMoves.map((move) => {
            const selected = selectedTaskIds.has(move.taskId);
            return <button
              key={move.taskId}
              type="button"
              className={`balance-move ${selected ? 'selected' : ''}`}
              aria-pressed={selected}
              onClick={() => toggleMove(move.taskId)}
            >
              <span className="balance-check" aria-hidden="true">{selected && <Check />}</span>
              <span className="balance-move-copy"><strong>{move.title}</strong><span className="balance-route">{move.fromDayLabel} <ArrowRight aria-hidden="true" /> {move.toDayLabel} <i aria-hidden="true">·</i> {move.relocatedPoints} points</span><small>{move.reason}</small></span>
            </button>;
          })}
        </div>
      </section>

      <section className="balance-action-area" aria-label="Balance plan summary">
        <div><strong>{selectedPoints} / {relocatedLoad} points moved</strong><span>{remainingPoints} points remaining</span></div>
        <Button className="primary-action" disabled={!canApply}><Scale /> Apply plan</Button>
      </section>
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
