import { NextResponse } from 'next/server';
import { getGroq, TRANSLATE_MODEL } from '@/lib/groq';
import { HANDOUT_JSON_SCHEMA, LANGUAGES, isPatientHandout, type Language } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You translate patient handouts written by health workers into the requested Nigerian language or dialect.
Rules:
- Use natural, warm, plain language that an everyday patient or caregiver in Nigeria understands. Avoid medical jargon and literal word-for-word translation.
- Keep every number exactly as written: dosages, fluid volumes, temperatures, times and counts. Do not convert units.
- Keep every emergency warning sign complete and unmistakable. Never drop, soften or add warning signs or steps.
- Keep the same JSON structure and the same number of list items.
- Nigerian Pidgin means standard Nigerian Pidgin English. Igbo, Yoruba and Hausa should use common modern spelling; include tone marks only where they help avoid confusion.
- Output only JSON matching the schema.`;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const target = b.targetLanguage;
  if (typeof target !== 'string' || !(LANGUAGES as readonly string[]).includes(target)) {
    return NextResponse.json({ error: 'Invalid targetLanguage' }, { status: 400 });
  }
  if (!isPatientHandout(b.handout)) {
    return NextResponse.json({ error: 'Invalid handout' }, { status: 400 });
  }
  const handout = b.handout;
  const targetLanguage = target as Language;

  if (targetLanguage === 'English') {
    return NextResponse.json({ handout, language: targetLanguage, latencyMs: 0, model: null });
  }

  try {
    const groq = getGroq();
    const started = Date.now();
    const completion = await groq.chat.completions.create({
      model: TRANSLATE_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Translate this handout into ${targetLanguage}.\n\n${JSON.stringify(handout)}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'translated_handout', strict: true, schema: HANDOUT_JSON_SCHEMA },
      },
      ...({ reasoning_effort: 'low' } as Record<string, unknown>),
    });
    const latencyMs = Date.now() - started;

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: 'Empty translation response' }, { status: 502 });

    let translated: unknown;
    try {
      translated = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Translation returned invalid JSON' }, { status: 502 });
    }
    if (!isPatientHandout(translated)) {
      return NextResponse.json({ error: 'Translation did not match the handout schema' }, { status: 502 });
    }
    return NextResponse.json({ handout: translated, language: targetLanguage, latencyMs, model: TRANSLATE_MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: message.includes('GROQ_API_KEY') ? 500 : 502 });
  }
}
