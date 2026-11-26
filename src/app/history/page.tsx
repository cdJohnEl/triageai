'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, Loader2, RefreshCw, Siren } from 'lucide-react';
import TriageResultCard from '@/components/TriageResultCard';
import type { TriageLevel, TriageSessionRecord } from '@/lib/schemas';

type Filter = 'ALL' | TriageLevel;

interface Stats {
  total: number;
  red: number;
  yellow: number;
  green: number;
}

const BADGE: Record<TriageLevel, { cls: string; label: string; Icon: typeof Siren }> = {
  RED: { cls: 'bg-tri-redSoft text-tri-redInk', label: 'RED', Icon: Siren },
  YELLOW: { cls: 'bg-tri-amberSoft text-tri-amberInk', label: 'YELLOW', Icon: AlertTriangle },
  GREEN: { cls: 'bg-tri-okSoft text-tri-okInk', label: 'GREEN', Icon: CheckCircle2 },
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [sessions, setSessions] = useState<TriageSessionRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, red: 0, yellow: 0, green: 0 });
  const [backend, setBackend] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TriageSessionRecord | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions?level=${f}`, { cache: 'no-store' });
      const data = (await res.json()) as { sessions?: TriageSessionRecord[]; stats?: Stats; backend?: string; error?: string };
      if (!res.ok || !data.sessions || !data.stats) throw new Error(data.error ?? 'Could not load the shift log');
      setSessions(data.sessions);
      setStats(data.stats);
      setBackend(data.backend ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the shift log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  if (selected) {
    const b = BADGE[selected.triage_level];
    return (
      <>
        <button type="button" onClick={() => setSelected(null)} className="btn-secondary min-h-[48px] px-4">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to shift log
        </button>
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${b.cls}`}>
              <b.Icon className="h-4 w-4" aria-hidden="true" /> {b.label}
            </span>
            <span className="text-sm font-semibold capitalize text-ink">
              {selected.age_group}, {selected.sex} · {selected.duration_days} day(s)
            </span>
            <span className="text-sm text-mute">{new Date(selected.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-base text-ink">{selected.symptoms_raw}</p>
        </div>
        <TriageResultCard assessment={selected.triage_output} resetKey={selected.id} />
      </>
    );
  }

  const tiles: { id: Filter; label: string; value: number; tone: string; Icon: typeof Siren }[] = [
    { id: 'ALL', label: 'Total assessed', value: stats.total, tone: 'text-ink', Icon: ClipboardList },
    { id: 'RED', label: 'Red referrals', value: stats.red, tone: 'text-tri-redInk', Icon: Siren },
    { id: 'YELLOW', label: 'Yellow urgent', value: stats.yellow, tone: 'text-tri-amberInk', Icon: AlertTriangle },
    { id: 'GREEN', label: 'Green home care', value: stats.green, tone: 'text-tri-okInk', Icon: CheckCircle2 },
  ];

  return (
    <>
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Shift log</h1>
        <p className="mt-1 text-base text-mute">
          Anonymous consultations only.{backend && ` Storage: ${backend === 'firebase' ? 'Firebase' : 'local fallback (not saved between server restarts on hosted sites)'}.`}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Filter by triage level">
        {tiles.map(({ id, label, value, tone, Icon }) => {
          const on = filter === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setFilter(id)}
              className={`card cursor-pointer p-4 text-left transition-colors duration-150 ${on ? 'border-2 border-brand bg-brand-soft' : 'hover:border-brand'}`}
            >
              <span className={`flex items-center gap-1.5 text-sm font-bold ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </span>
              <span className="mt-1 block text-4xl font-extrabold text-ink">{value}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {loading && (
          <ul className="space-y-2" aria-label="Loading consultations">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card h-[76px] motion-safe:animate-pulse bg-surface2" />
            ))}
          </ul>
        )}

        {error && (
          <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-tri-red p-4">
            <p className="font-semibold text-tri-redInk">{error}</p>
            <button type="button" onClick={() => void load(filter)} className="btn-secondary min-h-[48px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <ClipboardList className="h-10 w-10 text-brand" aria-hidden="true" />
            <p className="text-lg font-bold text-ink">{filter === 'ALL' ? 'No consultations yet' : `No ${filter} cases yet`}</p>
            <p className="max-w-sm text-base text-mute">Run a triage from the home screen and it will show up here, without any personal details.</p>
            <Link href="/" className="btn-primary">
              Start a triage
            </Link>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const b = BADGE[s.triage_level];
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setSelected(s)} className="card flex min-h-[76px] w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors duration-150 hover:border-brand">
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${b.cls}`}>
                      <b.Icon className="h-4 w-4" aria-hidden="true" /> {b.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-ink">{s.triage_output.urgency_headline}</span>
                      <span className="block text-sm capitalize text-mute">
                        {s.age_group}, {s.sex} ·{' '}
                        <time dateTime={s.created_at}>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-mute" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {loading && (
        <p className="sr-only">
          <Loader2 aria-hidden="true" /> Loading
        </p>
      )}
    </>
  );
}
