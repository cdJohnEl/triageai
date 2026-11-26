'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Copy, FileText, Quote, Siren, Zap } from 'lucide-react';
import HandoutModal from './HandoutModal';
import type { TriageAssessment, TriageLevel } from '@/lib/schemas';

interface Props {
  assessment: TriageAssessment;
  latencyMs?: number;
  /** Changes when a different assessment is shown, to reset checklist state. */
  resetKey?: string;
}

type Tab = 'actions' | 'differential' | 'handout' | 'sbar';

const LEVEL: Record<TriageLevel, { bg: string; text: string; label: string; sub: string; Icon: typeof Siren }> = {
  RED: { bg: 'bg-tri-red', text: 'text-white', label: 'RED', sub: 'Immediate emergency referral', Icon: Siren },
  YELLOW: { bg: 'bg-tri-amber', text: 'text-tri-amberInk', label: 'YELLOW', sub: 'Urgent clinic observation / treatment', Icon: AlertTriangle },
  GREEN: { bg: 'bg-tri-ok', text: 'text-white', label: 'GREEN', sub: 'Home care and scheduled follow-up', Icon: CheckCircle2 },
};

const LIKELIHOOD: Record<string, string> = {
  High: 'bg-tri-redSoft text-tri-redInk',
  Moderate: 'bg-tri-amberSoft text-tri-amberInk',
  Low: 'bg-surface2 text-mute',
};

export default function TriageResultCard({ assessment, latencyMs, resetKey }: Props) {
  const [tab, setTab] = useState<Tab>('actions');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [handoutOpen, setHandoutOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handoutBtn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setChecked({});
    setTab('actions');
    setHandoutOpen(false);
  }, [resetKey, assessment]);

  const lv = LEVEL[assessment.triage_level];
  const isUrgent = assessment.triage_level !== 'GREEN';
  const total = assessment.immediate_danger_signs_to_verify.length;
  const done = Object.values(checked).filter(Boolean).length;

  async function copySbar() {
    try {
      await navigator.clipboard.writeText(assessment.sbar_referral_note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'actions', label: 'Action plan' },
    { id: 'differential', label: 'Differential' },
    { id: 'handout', label: 'Handout' },
    { id: 'sbar', label: 'SBAR' },
  ];

  function onTabKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  return (
    <section aria-label="Triage result" className="card overflow-hidden">
      <div className={`${lv.bg} ${lv.text} p-5`}>
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/15">
            <lv.Icon className={`h-8 w-8 ${assessment.triage_level === 'RED' ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wider">
              Triage: {lv.label} · {lv.sub}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{assessment.urgency_headline}</h2>
          </div>
        </div>
        {isUrgent && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={copySbar} className="btn min-h-[52px] bg-white text-ink hover:bg-surface2">
              {copied ? <Check className="h-5 w-5 text-tri-ok" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
              {copied ? 'SBAR copied' : 'Copy SBAR referral'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('handout');
                setHandoutOpen(true);
              }}
              className="btn min-h-[52px] border-2 border-current bg-transparent hover:bg-black/10"
            >
              <FileText className="h-5 w-5" aria-hidden="true" /> Patient handout
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex gap-3 rounded-xl bg-surface2 p-4">
          <Quote className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-base leading-relaxed text-ink">{assessment.clinical_reasoning_summary}</p>
        </div>

        <section aria-labelledby="verify-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="verify-title" className="section-title">
              <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden="true" /> Verify these now
            </h3>
            <span className="text-sm font-bold text-mute">
              {done}/{total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label="Danger signs checked"
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface2"
          >
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
          </div>
          <p className="hint">Examine the patient, then tick each sign you have confirmed.</p>
          <ul className="mt-3 space-y-2">
            {assessment.immediate_danger_signs_to_verify.map((sign, i) => (
              <li key={i}>
                <label
                  className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors duration-150 ${
                    checked[i] ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-mute'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-6 w-6 shrink-0 cursor-pointer accent-[#0f766e]"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                  />
                  <span className="text-base font-medium text-ink">{sign}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div>
          <div role="tablist" aria-label="Result sections" className="flex gap-1 overflow-x-auto rounded-xl bg-surface2 p-1">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`min-h-[44px] flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors duration-150 ${
                  tab === t.id ? 'bg-surface text-brand-dark shadow-sm' : 'text-mute hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-4">
            {tab === 'actions' && (
              <ol className="space-y-2">
                {assessment.chw_action_steps.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-line p-3 text-base text-ink">
                    <span className="step-dot">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            )}

            {tab === 'differential' && (
              <ul className="space-y-2">
                {assessment.differential_considerations.map((d, i) => (
                  <li key={i} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{d.condition}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${LIKELIHOOD[d.likelihood] ?? LIKELIHOOD.Low}`}>{d.likelihood} likelihood</span>
                    </div>
                    <p className="mt-1 text-sm text-mute">{d.rationale}</p>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'handout' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-line p-3">
                  <p className="font-bold text-ink">{assessment.patient_handout_english.title}</p>
                  <p className="mt-1 text-sm text-mute">{assessment.patient_handout_english.summary}</p>
                </div>
                <button ref={handoutBtn} type="button" onClick={() => setHandoutOpen(true)} className="btn-primary min-h-[52px] w-full">
                  <FileText className="h-5 w-5" aria-hidden="true" /> Open, translate and share
                </button>
              </div>
            )}

            {tab === 'sbar' &&
              (isUrgent ? (
                <div className="space-y-3">
                  <pre className="whitespace-pre-wrap break-words rounded-xl border-2 border-ink bg-surface p-4 font-sans text-base leading-relaxed text-ink">{assessment.sbar_referral_note}</pre>
                  <button type="button" onClick={copySbar} className="btn-dark min-h-[52px] w-full">
                    {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy SBAR note'}
                  </button>
                </div>
              ) : (
                <p className="rounded-xl bg-surface2 p-4 text-sm text-mute">No referral note is needed for a GREEN case. Give the handout and book a follow-up.</p>
              ))}
          </div>
        </div>

        {latencyMs !== undefined && (
          <p className="flex items-center gap-1.5 text-sm text-mute">
            <Zap className="h-4 w-4" aria-hidden="true" /> Protocol Grounded • Groq LPU ({latencyMs}ms)
          </p>
        )}
      </div>

      {handoutOpen && <HandoutModal handout={assessment.patient_handout_english} onClose={() => setHandoutOpen(false)} />}
    </section>
  );
}
