'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TriageResultCard from '@/components/TriageResultCard';
import type { TriageLevel, TriageSessionRecord } from '@/lib/schemas';

type Filter = 'ALL' | TriageLevel;
const FILTERS: Filter[] = ['ALL', 'RED', 'YELLOW', 'GREEN'];

interface Stats {
  total: number;
  red: number;
  yellow: number;
  green: number;
}

const DOT: Record<TriageLevel, string> = { RED: 'bg-red-600', YELLOW: 'bg-amber-500', GREEN: 'bg-emerald-600' };

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [sessions, setSessions] = useState<TriageSessionRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, red: 0, yellow: 0, green: 0 });
  const [backend, setBackend] = useState<string>('');
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
    return (
      <>
        <button type="button" onClick={() => setSelected(null)} className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-sm font-bold text-moss-900">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to shift log
        </button>
        <div className="glass-soft p-3 text-sm text-slate-700">
          <p className="font-semibold capitalize text-slate-900">
            {selected.age_group}, {selected.sex} • {selected.duration_days} day(s) • {new Date(selected.created_at).toLocaleString()}
          </p>
          <p className="mt-1">{selected.symptoms_raw}</p>
        </div>
        <TriageResultCard assessment={selected.triage_output} resetKey={selected.id} />
      </>
    );
  }

  const cards: { label: string; value: number; cls: string }[] = [
    { label: 'Total assessed', value: stats.total, cls: 'bg-slate-900 text-white' },
    { label: 'Red referrals', value: stats.red, cls: 'bg-red-600 text-white' },
    { label: 'Yellow urgent', value: stats.yellow, cls: 'bg-amber-500 text-slate-900' },
    { label: 'Green home care', value: stats.green, cls: 'bg-emerald-600 text-white' },
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Shift log</h1>
        <p className="text-sm text-slate-600">
          Anonymous consultations only. No names, phone numbers or addresses are stored.
          {backend && ` Storage: ${backend === 'firebase' ? 'Firebase' : 'local fallback'}.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-3xl p-4 shadow-sm ${c.cls}`}>
            <p className="text-3xl font-extrabold">{c.value}</p>
            <p className="text-sm font-semibold">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by triage level">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`chip ${filter === f ? 'chip-on' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-slate-700" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading...
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="glass-soft p-6 text-center text-slate-700">No consultations yet. Run a triage from the home screen and it will appear here.</p>
      )}

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setSelected(s)} className="flex min-h-[64px] w-full items-center gap-3 glass-soft p-3 text-left hover:bg-white/80">
              <span className={`h-4 w-4 shrink-0 rounded-full ${DOT[s.triage_level]}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">
                  {s.triage_level} • <span className="capitalize">{s.age_group}, {s.sex}</span>
                </span>
                <span className="block truncate text-sm text-slate-700">{s.triage_output.urgency_headline}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-600">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
