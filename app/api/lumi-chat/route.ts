type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const fallbackReplies = [
  'Okay, come here for a second. That sounds like a lot to hold. Let us just make the next few minutes gentler: take one breath, choose one tiny thing you can control, and let the rest wait for now.',
  'I get why that feels heavy. You do not need to fix the whole day right now. Start with water, one slower breath, then the smallest next step you can actually do.',
  'You are not being dramatic. This is just a full moment. Put one hand down, unclench your jaw, and tell yourself: I only need to do the next small thing.',
];

const crisisPattern = /(suicide|kill myself|hurt myself|end my life|want to die|self harm)/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cleanMessage(message: unknown): ChatMessage | null {
  if (!message || typeof message !== 'object') return null;
  const value = message as Partial<ChatMessage>;
  if (value.role !== 'assistant' && value.role !== 'user') return null;
  if (typeof value.text !== 'string') return null;
  const text = value.text.trim().slice(0, 900);
  if (!text) return null;
  return { role: value.role, text };
}

function getFallbackReply(seed: string) {
  const index = Math.abs(seed.length) % fallbackReplies.length;
  return fallbackReplies[index];
}

function getApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getModel() {
  return process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
}

function getEndpoint() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`;
}

function softenReply(reply: string) {
  return reply
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET() {
  const apiKey = getApiKey();
  if (!apiKey) return json({ online: false });

  try {
    const response = await fetch(getEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with only: online' }] }],
        generationConfig: {
          maxOutputTokens: 8,
          thinkingConfig: {
            thinkingLevel: 'low',
          },
        },
      }),
    });

    return json({ online: response.ok });
  } catch {
    return json({ online: false });
  }
}

export async function POST(request: Request) {
  let body: { messages?: unknown };

  try {
    body = await request.json();
  } catch {
    return json({ reply: 'I could not read that message. Try sending it again in one short sentence.', source: 'fallback' }, 400);
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.map(cleanMessage).filter((message): message is ChatMessage => Boolean(message)).slice(-10)
    : [];
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text ?? '';

  if (!latestUserMessage) {
    return json({ reply: 'Tell me what is on your mind first, even if it is messy.', source: 'fallback' }, 400);
  }

  if (crisisPattern.test(latestUserMessage)) {
    return json({
      reply: 'I am really glad you told me. Please move near someone you trust right now. If you might hurt yourself or are in immediate danger, contact local emergency services now. For this moment: put down anything unsafe, breathe slowly, and send one short message to a real person: "I need help staying safe."',
      source: 'safety',
    });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return json({ reply: getFallbackReply(latestUserMessage), source: 'fallback', reason: 'missing_gemini_key' });
  }

  const geminiMessages = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.text }],
  }));

  try {
    const response = await fetch(getEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                'You are Lumi, a warm student stress support companion inside LoadLight. You sound like a caring friend, not a formal AI assistant.',
                'Your job is to help users talk through stress, workload, deadlines, focus, guilt, conflict, and tiredness.',
                'Begin by gently acknowledging the feeling in a human way. Do not over-explain.',
                'Use natural, emotionally warm language. It is okay to say things like "That sounds really heavy" or "I am here with you for a minute."',
                'Do not use markdown, headings, bullet points, numbered lists, clinical labels, or corporate productivity language.',
                'Avoid phrases like "Here are two quick things", "as an AI", "it is important to", or "I recommend".',
                'Do not diagnose, do not claim to be a therapist, and do not give medical treatment.',
                'Keep replies to 2 short paragraphs at most.',
                'Give one small next step the user can do in the next few minutes, and optionally ask one soft follow-up question.',
                'If the user may be in danger or mentions self-harm, encourage immediate real-world help and emergency services.',
              ].join(' '),
            },
          ],
        },
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 220,
          thinkingConfig: {
            thinkingLevel: 'low',
          },
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;
    const reply = softenReply(data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '');

    if (!response.ok || !reply) {
      return json({
        reply: getFallbackReply(latestUserMessage),
        source: 'fallback',
        reason: data.error?.message ?? 'gemini_empty_response',
      });
    }

    return json({ reply, source: 'gemini' });
  } catch {
    return json({ reply: getFallbackReply(latestUserMessage), source: 'fallback', reason: 'gemini_request_failed' });
  }
}
