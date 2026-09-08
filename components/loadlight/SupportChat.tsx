'use client';

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Lumi } from '@/components/loadlight/Lumi';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type LumiChatResponse = {
  reply?: string;
  source?: 'fallback' | 'gemini' | 'safety';
};

type LumiStatusResponse = {
  online?: boolean;
};

type LauncherPosition = {
  left: number;
  top: number;
};

type DragState = LauncherPosition & {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const launcherPositionKey = 'loadlight-lumi-chat-position';

const starterPrompts = [
  'I feel overwhelmed',
  'I need a quick reset',
  "I don't know where to start",
  'I cannot focus',
  'I said yes to too much',
  'I feel guilty for resting',
];

const firstMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hey, I am here with you. Tell me what has been sitting on your mind. We can untangle it slowly.',
};

function getSupportReply(message: string) {
  const lower = message.toLowerCase();

  if (/(suicide|kill myself|hurt myself|end my life|want to die)/.test(lower)) {
    return 'I am really glad you told me. Please do not stay alone with this right now. Move near someone you trust, and if you might hurt yourself or are in immediate danger, contact local emergency services now. Put down anything unsafe, breathe with me, and send one short message to someone real: "I need help staying safe."';
  }

  if (/(quick reset|reset|calm down|breathe)/.test(lower)) {
    return 'Okay, let us make your body feel a little safer first. Drop your shoulders, breathe in slowly, then breathe out even slower. After that, write one sentence only: "The next thing I can do is ___." Tiny is enough.';
  }

  if (/(cannot focus|can't focus|distracted|scrolling|procrastinat|no motivation)/.test(lower)) {
    return 'That stuck feeling is so frustrating. It does not mean you are lazy. It may just mean the task feels too big to enter. Try 12 minutes only, with permission to make the first version ugly.';
  }

  if (/(said yes|too many|too much|no time|overcommitted|commitment)/.test(lower)) {
    return 'Oof, that is a lot of yeses sitting on you. You do not have to carry every yes at full size. Pick one thing to make smaller: later time, smaller scope, or "I can help for 20 minutes, but I cannot take the whole thing."';
  }

  if (/(guilty|lazy|resting|rest|break)/.test(lower)) {
    return 'I know guilt can make rest feel wrong, but you are allowed to be a person, not a machine. Take a bounded break: 20 minutes to recover, then one tiny action. Rest can be part of getting through it.';
  }

  if (/(tired|sleep|exhaust|burnout|drain)/.test(lower) && /(deadline|assignment|exam|task|project|study)/.test(lower)) {
    return 'Tired plus deadline is honestly such a hard combo. Do not force full productivity mode. Take a 10-minute body reset first, then do the easiest deadline step: open the file, write 3 rough bullets, or send one update.';
  }

  if (/(overwhelm|stress|anxious|panic|too much|full)/.test(lower)) {
    return 'That sounds really heavy. Stay with me for a minute. You do not need to solve the whole day. Name the one thing that must happen next, then let one thing wait without arguing with yourself.';
  }

  if (/(tired|sleep|exhaust|burnout|drain)/.test(lower)) {
    return 'Your body sounds like it is asking for room. Drink some water, take a few slow breaths, then choose either a 20-minute rest or one tiny low-energy task. Recovery still counts.';
  }

  if (/(study|assignment|deadline|exam|task|project)/.test(lower)) {
    return 'Okay, let us take the pressure down a notch. Pick the deadline that matters most, then write the smallest next action. Not the perfect plan, just the next clear step.';
  }

  if (/(friend|team|group|argue|angry|conflict|misunderstood)/.test(lower)) {
    return 'That kind of thing can sit in your chest for hours. Before you reply, write the messy version somewhere private first. Then soften it into one clear line: "I felt ___ when ___, can we ___?"';
  }

  if (/(presentation|present|stage|nervous|speaking)/.test(lower)) {
    return 'Nerves make sense. It means this matters to you. Keep it small tonight: practise just the first 30 seconds twice, then prepare one backup sentence. You only need to guide people through the idea, not be perfect.';
  }

  if (/(sad|lonely|cry|upset|angry|hurt)/.test(lower)) {
    return 'I am sorry it feels like this. You do not have to clean the feeling up before saying it. Try naming it plainly: "I feel ___ because ___." Then do one kind thing for yourself, even a very small one.';
  }

  return 'I hear you. That sounds like something that has been taking up space in your head. Let us make it a bit easier to hold: what is the smallest part of this you can control right now?';
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([firstMessage]);
  const [draft, setDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState('');
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const chatRootRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const blockClickRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const latestTone = useMemo(() => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text.toLowerCase() ?? '';
    if (/(tired|sleep|exhaust|burnout|drain)/.test(lastUserMessage)) return 'tired';
    if (/(overwhelm|stress|anxious|panic|too much|full)/.test(lastUserMessage)) return 'stressed';
    if (/(sad|lonely|cry|upset|angry|hurt)/.test(lastUserMessage)) return 'recovering';
    return 'steady';
  }, [messages]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isReplying]);

  useEffect(() => {
    try {
      const storedPosition = window.localStorage.getItem(launcherPositionKey);
      if (!storedPosition) return;
      const parsed = JSON.parse(storedPosition) as Partial<LauncherPosition>;
      if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
        setLauncherPosition({ left: parsed.left, top: parsed.top });
      }
    } catch {
      setLauncherPosition(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function checkLumiStatus() {
      try {
        const response = await fetch('/api/lumi-chat');
        const data = (await response.json()) as LumiStatusResponse;
        if (active) setConnectionLabel(response.ok && data.online ? 'Lumi online' : '');
      } catch {
        if (active) setConnectionLabel('');
      }
    }

    void checkLumiStatus();

    return () => {
      active = false;
    };
  }, [open]);

  function getBoundedLauncherPosition(left: number, top: number) {
    const frame = chatRootRef.current?.parentElement;
    if (!frame) return { left, top };

    const launcherSize = 56;
    const edgeGap = 12;
    const bottomNavSpace = 76;
    const frameRect = frame.getBoundingClientRect();
    const maxLeft = Math.max(edgeGap, frameRect.width - launcherSize - edgeGap);
    const maxTop = Math.max(edgeGap, frameRect.height - launcherSize - bottomNavSpace);

    return {
      left: Math.min(Math.max(left, edgeGap), maxLeft),
      top: Math.min(Math.max(top, edgeGap), maxTop),
    };
  }

  function saveLauncherPosition(position: LauncherPosition) {
    try {
      window.localStorage.setItem(launcherPositionKey, JSON.stringify(position));
    } catch {
      // Local storage can be unavailable in restricted browser modes.
    }
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (open) return;
    const root = chatRootRef.current;
    const frame = root?.parentElement;
    if (!root || !frame) return;

    const rootRect = root.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rootRect.left - frameRect.left,
      top: rootRect.top - frameRect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragState.moved = true;
    }

    setLauncherPosition(getBoundedLauncherPosition(dragState.left + deltaX, dragState.top + deltaY));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const root = chatRootRef.current;
    const frame = root?.parentElement;
    if (root && frame && dragState.moved) {
      const rootRect = root.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const finalPosition = getBoundedLauncherPosition(rootRect.left - frameRect.left, rootRect.top - frameRect.top);
      setLauncherPosition(finalPosition);
      saveLauncherPosition(finalPosition);
      blockClickRef.current = true;
      window.setTimeout(() => {
        blockClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function openChat() {
    if (blockClickRef.current) {
      blockClickRef.current = false;
      return;
    }
    setOpen(true);
  }

  async function fetchLumiReply(nextMessages: ChatMessage[], latestText: string) {
    try {
      const response = await fetch('/api/lumi-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({ role: message.role, text: message.text })),
        }),
      });
      const data = (await response.json()) as LumiChatResponse;
      if (!response.ok || !data.reply) {
        setConnectionLabel('');
        return getSupportReply(latestText);
      }
      setConnectionLabel(data.source === 'gemini' ? 'Lumi online' : '');
      return data.reply;
    } catch {
      setConnectionLabel('');
      return getSupportReply(latestText);
    }
  }

  async function sendMessage(text: string) {
    const cleanText = text.trim();
    if (!cleanText || isReplying) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanText,
    };
    const nextMessages = [...messages, userMessage].slice(-12);

    setMessages(nextMessages);
    setDraft('');
    setIsReplying(true);

    const reply = await fetchLumiReply(nextMessages, cleanText);
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: reply,
      },
    ]);
    setIsReplying(false);
  }

  function sendStarterMessage(text: string) {
    void sendMessage(text);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function clearChat() {
    if (isReplying) return;
    setMessages([firstMessage]);
    setDraft('');
  }

  return (
    <aside
      ref={chatRootRef}
      className={`support-chat ${open ? 'open' : ''} ${launcherPosition && !open ? 'moved' : ''}`}
      style={!open && launcherPosition ? launcherPosition : undefined}
      aria-label="Lumi support chat"
    >
      {!open ? (
        <button
          className="chat-launcher"
          type="button"
          onClick={openChat}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Open Lumi support chat"
          title="Drag to move or tap to chat"
        >
          <MessageCircle />
          <span>Talk</span>
        </button>
      ) : (
        <section className="chat-panel" role="dialog" aria-label="Lumi support chat">
          <header className="chat-panel-header">
            <Lumi state={latestTone} size="small" />
            <div>
              <h2>Talk it through</h2>
              {connectionLabel && <p>{connectionLabel}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Lumi support chat">
              <X />
            </button>
          </header>

          <div className="chat-messages" ref={messageListRef}>
            {messages.map((message) => (
              <p key={message.id} className={`chat-message ${message.role}`}>
                {message.text}
              </p>
            ))}
            {isReplying && (
              <p className="chat-message assistant thinking">
                <Sparkles />
                Lumi is thinking...
              </p>
            )}
          </div>

          <div className="chat-suggestions" aria-label="Quick chat prompts">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendStarterMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="chat-composer" onSubmit={submit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type what is on your mind..."
              aria-label="Message Lumi"
            />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || isReplying}>
              <Send />
            </button>
          </form>

          <button className="chat-clear" type="button" onClick={clearChat} disabled={isReplying}>
            Start fresh
          </button>
        </section>
      )}
    </aside>
  );
}
