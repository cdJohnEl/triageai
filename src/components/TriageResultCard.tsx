'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Check, FileText, Siren, Zap } from 'lucide-react';
import HandoutModal from './HandoutModal';
import type { TriageAssessment, TriageLevel } from '@/lib/schemas';

interface Props {
  assessment: TriageAssessment;
  latencyMs?: number;
  /** Changes when a different assessment is shown, to reset checklist state. */
  resetKey?: string;
}

type Tab = 'actions' | 'differential' | 'handout' | 'sbar';

const LEVEL: Record<TriageLevel, { bg: string; label: string; sub: string }> = {
  RED: { bg: '#DC2626', label: 'RED', sub: 'Immediate emergency referral' },
  YELLOW: { bg: '#F59E0B', label: 'YELLOW', sub: 'Urgent clinic observation / treatment' },
  GREEN: { bg: '#059669', label: 'GREEN', sub: 'Home care and scheduled follow-up' },
};

const LIKELIHOOD: Record<string, string> = {
  High: 'bg-red-100 text-red-900',
  Moderate: 'bg-amber-100 text-amber-900',
  Low: 'bg-slate-200 text-slate-800',
};

export default function TriageResultCard({ assessment, latencyMs, resetKey }: Props) {
  const [tab, setTab] = useState<Tab>('actions');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [handoutOpen, setHandoutOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setChecked({});
    setTab('actions');
    setHandoutOpen(false);
  }, [resetKey, assessment]);

  const level = LEVEL[assessment.triage_level];
  const isUrgent = assessment.triage_level !== 'GREEN';
  const Icon = assessment.triage_level === 'RED' ? Siren : assessment.triage_level === 'YELLOW' ? AlertTriangle : CheckCircle2;
  const darkText = assessment.triage_level === 'YELLOW' ? 'text-slate-900' : 'text-white';
  const doneCount = Object.values(checked).filter(Boolean).length;
  const total = assessment.immediate_danger_signs_to_verify.length;

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
    { id: 'handout', label: 'Patient handout' },
    { id: 'sbar', label: isUrgent ? 'SBAR referral' : 'SBAR' },
  ];

  return (
    <section aria-label="Triage result" className="glass overflow-hidden">
      <div className={`p-5 ${darkText}`} style={{ backgroundColor: level.bg }}>
        <div className="flex items-start gap-3">
          <Icon className={`h-9 w-9 shrink-0 ${assessment.triage_level === 'RED' ? 'animate-pulse' : ''}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold opacity-90">{level.sub}</p>
            <h2 className="text-2xl font-extrabold leading-tight">
              {level.label}: {assessment.urgency_headline}
            </h2>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {latencyMs !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Protocol Grounded • Groq LPU ({latencyMs}ms)
            </span>
          )}
          {isUrgent && (
            <button
              type="button"
              onClick={copySbar}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-900 shadow"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'SBAR copied' : 'Copy SBAR referral'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <p className="text-base leading-relaxed text-slate-800">{assessment.clinical_reasoning_summary}</p>

        <div className="rounded-2xl border border-white/80 bg-white/40 p-3">
          <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> Verify these danger signs now
          </h3>
          <p className="mb-2 text-xs font-medium text-slate-600">
            {doneCount} of {total} checked. Tap each sign after you examine the patient.
          </p>
          <ul className="space-y-2">
            {assessment.immediate_danger_signs_to_verify.map((sign, i) => (
              <li key={i}>
                <label className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${checked[i] ? 'border-emerald-600 bg-emerald-50' : 'border-white/80 bg-white/60'}`}>
                  <input
                    type="checkbox"
                    className="h-6 w-6 shrink-0 accent-emerald-700"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                  />
                  <span className="text-base text-slate-900">{sign}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div role="tablist" aria-label="Result sections" className="flex gap-1 overflow-x-auto border-b border-moss-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-[48px] shrink-0 border-b-4 px-3 text-sm font-bold ${tab === t.id ? 'border-moss-800 text-moss-900' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'actions' && (
          <ol className="space-y-2">
            {assessment.chw_action_steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-white/55 p-3 text-base text-slate-900">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss-800 text-sm font-bold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        {tab === 'differential' && (
          <ul className="space-y-2">
            {assessment.differential_considerations.map((d, i) => (
              <li key={i} className="rounded-2xl bg-white/55 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-slate-900">{d.condition}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LIKELIHOOD[d.likelihood] ?? LIKELIHOOD.Low}`}>{d.likelihood} likelihood</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{d.rationale}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'handout' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white/55 p-3">
              <p className="font-bold text-slate-900">{assessment.patient_handout_english.title}</p>
              <p className="mt-1 text-sm text-slate-700">{assessment.patient_handout_english.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setHandoutOpen(true)}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-moss-800 px-4 text-base font-bold text-white hover:bg-moss-900"
            >
              <FileText className="h-5 w-5" aria-hidden="true" /> Open handout, translate and share
            </button>
          </div>
        )}

        {tab === 'sbar' && (
          <div className={`rounded-2xl p-4 ${isUrgent ? 'border-2 border-slate-900 bg-white/90' : 'bg-white/55'}`}>
            {isUrgent ? (
              <>
                <pre className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed text-slate-900">{assessment.sbar_referral_note}</pre>
                <button
                  type="button"
                  onClick={copySbar}
                  className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-base font-bold text-white"
                >
                  {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy SBAR note'}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-700">No referral note needed for a GREEN case. Give the handout and book follow-up.</p>
            )}
          </div>
        )}
      </div>

      {handoutOpen && <HandoutModal handout={assessment.patient_handout_english} onClose={() => setHandoutOpen(false)} />}
    </section>
  );
}
