'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Stethoscope, Zap } from 'lucide-react';
import { AGE_GROUPS, SEXES, type AgeGroup, type Sex, type TriageResponse } from '@/lib/schemas';

interface Props {
  onResult: (result: TriageResponse) => void;
}

interface FormState {
  ageGroup: AgeGroup;
  ageYears: string;
  sex: Sex;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  bloodPressure: string;
  spo2: string;
  durationDays: string;
  symptoms: string;
}

const EMPTY: FormState = {
  ageGroup: 'adult',
  ageYears: '',
  sex: 'male',
  temperatureC: '',
  heartRate: '',
  respiratoryRate: '',
  bloodPressure: '',
  spo2: '',
  durationDays: '1',
  symptoms: '',
};

const AGE_LABELS: Record<AgeGroup, string> = {
  infant: 'Infant 0–11m',
  child: 'Child 1–12y',
  adult: 'Adult 13–59y',
  pregnant: 'Pregnant',
  elderly: 'Elderly 60y+',
};

const DEMOS: { label: string; hint: string; state: FormState }[] = [
  {
    label: 'Pediatric Danger Sign',
    hint: 'Child, 2 yrs',
    state: {
      ...EMPTY,
      ageGroup: 'child',
      ageYears: '2',
      sex: 'female',
      temperatureC: '39.4',
      respiratoryRate: '54',
      durationDays: '2',
      symptoms: 'Child body dey very hot since two days, weak and lethargic, refusing breastmilk and water, fast breathing.',
    },
  },
  {
    label: 'Maternal Red Flag',
    hint: 'Pregnant, 28 yrs',
    state: {
      ...EMPTY,
      ageGroup: 'pregnant',
      ageYears: '28',
      sex: 'female',
      bloodPressure: '156/104',
      heartRate: '102',
      durationDays: '1',
      symptoms: '7 months pregnant, severe throbbing headache since morning, blurred vision, swollen feet.',
    },
  },
  {
    label: 'Uncomplicated Mild Case',
    hint: 'Adult, 32 yrs',
    state: {
      ...EMPTY,
      ageGroup: 'adult',
      ageYears: '32',
      sex: 'male',
      temperatureC: '37.5',
      heartRate: '82',
      bloodPressure: '118/76',
      durationDays: '1',
      symptoms: 'Mild watery stool 3 times today, no blood, alert, drinking water normally, mild body ache.',
    },
  },
];

const TILE = ['from-teal-100 via-moss-100 to-white/70', 'from-lime-100 via-moss-200 to-white/70', 'from-moss-100 via-emerald-100 to-white/70'];

const STEPS = [
  'Checking vital thresholds...',
  'Cross-referencing WHO/PHC danger signs via Groq...',
  'Building action plan and handout...',
];

const inputCls = 'field';

export default function IntakeForm({ onResult }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 112)}px`;
  }, [form.symptoms]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 700);
    return () => window.clearInterval(id);
  }, [loading]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.symptoms.trim().length < 3) {
      setError('Describe the symptoms before running triage.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageGroup: form.ageGroup,
          ageYears: num(form.ageYears),
          sex: form.ageGroup === 'pregnant' ? 'female' : form.sex,
          vitals: {
            temperatureC: num(form.temperatureC),
            heartRate: num(form.heartRate),
            respiratoryRate: num(form.respiratoryRate),
            bloodPressure: form.bloodPressure.trim() || undefined,
            spo2: num(form.spo2),
          },
          durationDays: num(form.durationDays) ?? 1,
          symptoms: form.symptoms,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? 'Triage failed';
        throw new Error(msg);
      }
      onResult(data as TriageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Triage failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const pill = (active: boolean) => `chip ${active ? 'chip-on' : ''}`;

  return (
    <form onSubmit={submit} className="space-y-6 glass p-4 sm:p-6">
      <section aria-label="Quick demo cases">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
          Quick Demo Cases
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {DEMOS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setForm(d.state);
                setError(null);
              }}
              className={`flex min-h-[88px] flex-col justify-end rounded-3xl border border-white/80 bg-gradient-to-br ${TILE[i]} px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5`}
            >
              <span className="block text-sm font-bold text-slate-900">{d.label}</span>
              <span className="block text-xs text-slate-600">{d.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">Age group</legend>
        <div className="flex flex-wrap gap-2">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={form.ageGroup === a}
              onClick={() => setForm((f) => ({ ...f, ageGroup: a, sex: a === 'pregnant' ? 'female' : f.sex }))}
              className={pill(form.ageGroup === a)}
            >
              {AGE_LABELS[a]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-slate-700">Sex</legend>
          <div className="flex gap-2">
            {SEXES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={form.sex === s}
                disabled={form.ageGroup === 'pregnant' && s === 'male'}
                onClick={() => set('sex', s)}
                className={`${pill(form.sex === s)} flex-1 capitalize disabled:opacity-40`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Age (years, optional)</span>
          <input className={inputCls} inputMode="decimal" value={form.ageYears} onChange={(e) => set('ageYears', e.target.value)} placeholder="e.g. 2" />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">Vitals (leave blank if not measured)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Temp (°C)</span>
            <input className={inputCls} inputMode="decimal" value={form.temperatureC} onChange={(e) => set('temperatureC', e.target.value)} placeholder="37.0" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Heart rate (bpm)</span>
            <input className={inputCls} inputMode="numeric" value={form.heartRate} onChange={(e) => set('heartRate', e.target.value)} placeholder="80" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Resp. rate (/min)</span>
            <input className={inputCls} inputMode="numeric" value={form.respiratoryRate} onChange={(e) => set('respiratoryRate', e.target.value)} placeholder="20" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">BP (mmHg)</span>
            <input className={inputCls} value={form.bloodPressure} onChange={(e) => set('bloodPressure', e.target.value)} placeholder="120/80" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">SpO₂ (%)</span>
            <input className={inputCls} inputMode="numeric" value={form.spo2} onChange={(e) => set('spo2', e.target.value)} placeholder="97" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Duration (days)</span>
            <input className={inputCls} inputMode="numeric" value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} placeholder="1" />
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Symptoms</span>
        <textarea
          ref={textRef}
          value={form.symptoms}
          onChange={(e) => set('symptoms', e.target.value)}
          placeholder='Describe in your own words, e.g. "body dey hot", "running stomach", "convulsion"'
          className="field min-h-[112px] resize-none overflow-hidden py-3"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-moss-800 px-4 text-base font-bold text-white hover:bg-moss-900 disabled:opacity-80"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span aria-live="polite">{STEPS[step]}</span>
          </>
        ) : (
          <>
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
            Run triage
          </>
        )}
      </button>
    </form>
  );
}
