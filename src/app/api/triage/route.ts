import { NextResponse } from 'next/server';
import { getGroq, formatPatientMessage, TRIAGE_MODEL } from '@/lib/groq';
import { CLINICAL_PROTOCOL } from '@/lib/protocols';
import {
  TRIAGE_JSON_SCHEMA,
  isTriageAssessment,
  parseTriageRequest,
  type TriageResponse,
} from '@/lib/schemas';
import { saveSession } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseTriageRequest(body);
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    const groq = getGroq();
    const started = Date.now();
    const completion = await groq.chat.completions.create({
      model: TRIAGE_MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: CLINICAL_PROTOCOL },
        { role: 'user', content: formatPatientMessage(parsed) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'triage_assessment', strict: true, schema: TRIAGE_JSON_SCHEMA },
      },
      ...({ reasoning_effort: 'low' } as Record<string, unknown>),
    });
    const latencyMs = Date.now() - started;

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'The model returned an empty response. Try again.' }, { status: 502 });
    }

    let assessment: unknown;
    try {
      assessment = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'The model returned invalid JSON. Try again.' }, { status: 502 });
    }
    if (!isTriageAssessment(assessment)) {
      return NextResponse.json({ error: 'The model response did not match the triage schema.' }, { status: 502 });
    }

    let sessionId: string | null = null;
    try {
      const record = await saveSession({
        age_group: parsed.ageGroup,
        sex: parsed.sex,
        vitals: parsed.vitals,
        duration_days: parsed.durationDays,
        symptoms_raw: parsed.symptoms,
        triage_level: assessment.triage_level,
        triage_output: assessment,
      });
      sessionId = record.id;
    } catch (err) {
      console.error('Failed to save session:', err);
    }

    const payload: TriageResponse = { assessment, latencyMs, model: TRIAGE_MODEL, sessionId };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Triage request failed';
    const status = message.includes('GROQ_API_KEY') ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
