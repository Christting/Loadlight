'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Lumi } from '@/components/loadlight/Lumi';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

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
  text: 'Hi, I am here. Tell me what is on your mind, and I will help you make the next few minutes feel smaller.',
};

function getSupportReply(message: string) {
  const lower = message.toLowerCase();

  if (/(suicide|kill myself|hurt myself|end my life|want to die)/.test(lower)) {
    return 'I am really glad you told me. Please move near someone you trust right now. If you might hurt yourself or are in immediate danger, contact local emergency services now. For this moment: put down anything unsafe, breathe slowly with me, and send one short message to a real person: "I need help staying safe."';
  }

  if (/(quick reset|reset|calm down|breathe)/.test(lower)) {
    return 'Let us do a quick reset. Drop your shoulders, breathe in for 4, out for 6, then write only one sentence: "The next thing I can do is ___." Keep it tiny.';
  }

  if (/(cannot focus|can't focus|distracted|scrolling|procrastinat|no motivation)/.test(lower)) {
    return 'Your brain may be protecting itself from a task that feels too big. Try this: set a 12-minute timer, hide one distraction, and start with the ugliest first draft. You are allowed to make it messy first.';
  }

  if (/(said yes|too many|too much|no time|overcommitted|commitment)/.test(lower)) {
    return 'It makes sense that your load feels packed. Choose one thing to renegotiate: ask for a later time, reduce the scope, or say "I can help for 20 minutes, but not take the whole thing." You do not have to carry every yes at full size.';
  }

  if (/(guilty|lazy|resting|rest|break)/.test(lower)) {
    return 'Rest is not laziness. It is maintenance. If guilt shows up, try a bounded break: 20 minutes to recover, then one tiny action. That way your brain gets safety and direction.';
  }

  if (/(tired|sleep|exhaust|burnout|drain)/.test(lower) && /(deadline|assignment|exam|task|project|study)/.test(lower)) {
    return 'Tired plus deadline is a tough combo. First, take a 10-minute body reset. Then do only the easiest deadline step: open the file, list 3 bullets, or send one update. No full productivity mode needed.';
  }

  if (/(overwhelm|stress|anxious|panic|too much|full)/.test(lower)) {
    return 'That sounds heavy. Let us make it smaller: name the one thing that must happen next, pause one thing that can wait, and give yourself a 10-minute start instead of trying to solve the whole day.';
  }

  if (/(tired|sleep|exhaust|burnout|drain)/.test(lower)) {
    return 'Your body is asking for room. Try a short reset first: water, 5 slow breaths, then choose between a 20-minute rest or one tiny low-energy task. Recovery still counts as progress.';
  }

  if (/(study|assignment|deadline|exam|task|project)/.test(lower)) {
    return 'Let us turn the pressure into a plan. Pick the deadline that matters most, write the smallest next action, and move one flexible task away from today. You only need the next clear step.';
  }

  if (/(friend|team|group|argue|angry|conflict|misunderstood)/.test(lower)) {
    return 'That sounds emotionally loud. Before replying, write the message you want to send, then soften it into one clear sentence: "I felt ___ when ___, can we ___?" You can protect the relationship and your boundary.';
  }

  if (/(presentation|present|stage|nervous|speaking)/.test(lower)) {
    return 'Nerves usually mean this matters. Keep the goal small: practise the first 30 seconds twice, prepare one backup line, and remind yourself that you only need to guide people through the idea, not perform perfectly.';
  }

  if (/(sad|lonely|cry|upset|angry|hurt)/.test(lower)) {
    return 'I am sorry it feels like this. Before fixing anything, try naming it plainly: "I feel ___ because ___." Then choose one comfort action: text someone, step away for air, or write the thought without judging it.';
  }

  return 'I hear you. Let us sort this into something you can actually hold: what is the main feeling, what is the smallest thing you can control, and what can wait until later?';
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([firstMessage]);
  const [draft, setDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);
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

  function sendMessage(text: string) {
    const cleanText = text.trim();
    if (!cleanText || isReplying) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanText,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setIsReplying(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: getSupportReply(cleanText),
        },
      ]);
      setIsReplying(false);
    }, 520);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <aside className={`support-chat ${open ? 'open' : ''}`} aria-label="Lumi support chat">
      {!open ? (
        <button className="chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open Lumi support chat">
          <MessageCircle />
          <span>Talk</span>
        </button>
      ) : (
        <section className="chat-panel" role="dialog" aria-label="Lumi support chat">
          <header className="chat-panel-header">
            <Lumi state={latestTone} size="small" />
            <div>
              <span>FEELING HEAVY?</span>
              <h2>Talk it through</h2>
              <p>No judgement, just the next calmer step.</p>
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
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
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
        </section>
      )}
    </aside>
  );
}
