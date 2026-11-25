import { NextResponse } from 'next/server';
import { TRIAGE_LEVELS, type TriageLevel } from '@/lib/schemas';
import { getBackend, listSessions } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const levelParam = (searchParams.get('level') ?? 'ALL').toUpperCase();
  const level = (TRIAGE_LEVELS as string[]).includes(levelParam) ? (levelParam as TriageLevel) : undefined;

  try {
    const all = await listSessions();
    const stats = {
      total: all.length,
      red: all.filter((s) => s.triage_level === 'RED').length,
      yellow: all.filter((s) => s.triage_level === 'YELLOW').length,
      green: all.filter((s) => s.triage_level === 'GREEN').length,
    };
    const sessions = level ? all.filter((s) => s.triage_level === level) : all;
    return NextResponse.json({ sessions, stats, backend: getBackend() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
