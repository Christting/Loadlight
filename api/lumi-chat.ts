type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

const fallbackReplies = [
  'That sounds like a lot to hold. Take one slower breath first, then choose one tiny next step you can actually do.',
  'I get why that feels heavy. You do not need to fix the whole week right now. Start with the smallest thing you can control.',
  'You are not being dramatic. This is a full moment. Put one thing down, unclench your jaw, and come back to only the next step.',
];

const fallbackBoundaryReplies = {
  soft: 'I want to help, but my capacity is full today. Can we move this to tomorrow or make my part smaller?',
  firm: 'I cannot take this on today. I need to protect the commitments I already have.',
  short: 'I am at capacity today. Can we move this to tomorrow?',
};

function sendJson(response: unknown, status = 200) {
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getModel() {
  return process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
}

function getEndpoint() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`;
}

function cleanReply(reply: string) {
  return reply
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallback(seed: string) {
  return fallbackReplies[Math.abs(seed.length) % fallbackReplies.length];
}

async function callGemini(systemText: string, userText: string, maxOutputTokens = 320) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(getEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        maxOutputTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  const data = (await response.json()) as GeminiResponse;
  const reply = cleanReply(data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '');
  if (!response.ok || !reply) return null;
  return reply;
}

export async function GET() {
  if (!getApiKey()) return sendJson({ online: false });

  try {
    const reply = await callGemini('Reply with only: online', 'Are you online?', 8);
    return sendJson({ online: Boolean(reply) });
  } catch {
    return sendJson({ online: false });
  }
}

export async function POST(request: Request) {
  let body: { messages?: ChatMessage[]; mode?: string; tone?: string; problem?: string };

  try {
    body = await request.json();
  } catch {
    return sendJson({ reply: fallback(''), source: 'fallback' }, 400);
  }

  if (body.mode === 'boundary') {
    const tone = body.tone === 'firm' || body.tone === 'short' ? body.tone : 'soft';
    const problem = typeof body.problem === 'string' ? body.problem.trim().slice(0, 700) : '';
    if (!problem) return sendJson({ reply: 'Write what happened first, then I can help you phrase the boundary.', source: 'fallback' }, 400);

    try {
      const reply = await callGemini(
        'You are Lumi inside LoadLight. Write one warm, respectful boundary reply for a stressed student. Return only the message the student can send. Keep it under 55 words. No markdown.',
        `Situation: ${problem}\nTone: ${tone}`,
        160,
      );
      return sendJson({ reply: reply ?? fallbackBoundaryReplies[tone], source: reply ? 'gemini' : 'fallback' });
    } catch {
      return sendJson({ reply: fallbackBoundaryReplies[tone], source: 'fallback' });
    }
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text?.trim() ?? '';
  if (!latestUserMessage) return sendJson({ reply: 'Tell me what is on your mind first, even if it is messy.', source: 'fallback' }, 400);

  try {
    const conversation = messages.map((message) => `${message.role}: ${message.text}`).join('\n');
    const reply = await callGemini(
      [
        'You are Lumi, a warm student stress support companion inside LoadLight.',
        'Help users talk through stress, workload, deadlines, focus, guilt, conflict, and tiredness.',
        'Do not diagnose or claim to be a therapist.',
        'Keep replies to 2 short paragraphs at most.',
        'Give one small next step the user can do in the next few minutes.',
      ].join(' '),
      conversation || latestUserMessage,
    );
    return sendJson({ reply: reply ?? fallback(latestUserMessage), source: reply ? 'gemini' : 'fallback' });
  } catch {
    return sendJson({ reply: fallback(latestUserMessage), source: 'fallback' });
  }
}
