'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Baby, Check, CheckCircle2, HeartPulse, Loader2, ShieldCheck, Stethoscope } from 'lucide-react';
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

type Errors = Partial<Record<keyof FormState, string>>;

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

const DEMOS: { label: string; hint: string; Icon: typeof Baby; state: FormState }[] = [
  {
    label: 'Pediatric Danger Sign',
    hint: 'Child, 2 yrs',
    Icon: Baby,
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
    Icon: HeartPulse,
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
    Icon: ShieldCheck,
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

const STEPS = ['Checking vital thresholds', 'Cross-referencing WHO/PHC danger signs via Groq', 'Building action plan and handout'];

function rangeError(value: string, min: number, max: number, label: string, integer = false): string | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (integer && !Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min || n > max) return `${label} should be between ${min} and ${max}`;
  return undefined;
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  e.temperatureC = rangeError(f.temperatureC, 30, 45, 'Temperature');
  e.heartRate = rangeError(f.heartRate, 20, 300, 'Heart rate', true);
  e.respiratoryRate = rangeError(f.respiratoryRate, 5, 120, 'Respiratory rate', true);
  e.spo2 = rangeError(f.spo2, 40, 100, 'SpO₂');
  e.ageYears = rangeError(f.ageYears, 0, 120, 'Age');
  e.durationDays = rangeError(f.durationDays || '1', 0, 365, 'Duration', true);
  if (f.bloodPressure.trim() !== '' && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(f.bloodPressure.trim())) {
    e.bloodPressure = 'Use the format 120/80';
  }
  if (f.symptoms.trim().length < 3) e.symptoms = 'Describe the symptoms in a few words';
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Errors;
}

interface FieldProps {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  unit?: string;
  placeholder?: string;
  mode?: 'decimal' | 'numeric' | 'text';
}

function NumField({ id, label, value, onChange, onBlur, error, unit, placeholder, mode = 'decimal' }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={unit ? 'field pr-16' : 'field'}
          inputMode={mode}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        {unit && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-mute">{unit}</span>}
      </div>
      {error && (
        <p id={`${id}-err`} className="err">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export default function IntakeForm({ onResult }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errors = useMemo(() => validate(form), [form]);
  const shown = (k: keyof FormState): string | undefined => (submitted || touched[k] ? errors[k] : undefined);
  const touch = (k: keyof FormState) => () => setTouched((t) => ({ ...t, [k]: true }));

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 128)}px`;
  }, [form.symptoms]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 700);
    return () => window.clearInterval(id);
  }, [loading]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));

  function loadDemo(state: FormState) {
    setForm(state);
    setTouched({});
    setSubmitted(false);
    setServerError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
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
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Triage failed');
      onResult(data as TriageResponse);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Triage failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const errorList = Object.entries(errors) as [keyof FormState, string][];

  return (
    <form onSubmit={submit} noValidate className="card space-y-7 p-4 sm:p-6">
      <section aria-labelledby="demo-title">
        <h2 id="demo-title" className="mb-2.5 text-sm font-bold uppercase tracking-wide text-mute">
          Quick demo cases
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {DEMOS.map(({ label, hint, Icon, state }) => (
            <button
              key={label}
              type="button"
              onClick={() => loadDemo(state)}
              className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-surface2 p-3 text-left transition-colors duration-150 hover:border-brand hover:bg-brand-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-dark">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight text-ink">{label}</span>
                <span className="block text-sm text-mute">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {submitted && errorList.length > 0 && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-tri-red bg-tri-redSoft p-4 outline-none">
          <p className="flex items-center gap-2 font-bold text-tri-redInk">
            <AlertCircle className="h-5 w-5" aria-hidden="true" /> Please fix {errorList.length} {errorList.length === 1 ? 'item' : 'items'}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-tri-redInk">
            {errorList.map(([k, msg]) => (
              <li key={k}>
                <a href={`#${k}`} className="font-semibold underline">
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="s1" className="space-y-4">
        <h2 id="s1" className="section-title">
          <span className="step-dot" aria-hidden="true">1</span> Patient
        </h2>
        <fieldset>
          <legend className="label">Age group</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Age group">
            {AGE_GROUPS.map((a) => {
              const on = form.ageGroup === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setForm((f) => ({ ...f, ageGroup: a, sex: a === 'pregnant' ? 'female' : f.sex }))}
                  className={`chip ${on ? 'chip-on' : ''}`}
                >
                  {on && <Check className="h-4 w-4" aria-hidden="true" />}
                  {AGE_LABELS[a]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="label">Sex</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Sex">
              {SEXES.map((s) => {
                const on = form.sex === s;
                const disabled = form.ageGroup === 'pregnant' && s === 'male';
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => set('sex', s)}
                    className={`chip flex-1 justify-center capitalize disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'chip-on' : ''}`}
                  >
                    {on && <Check className="h-4 w-4" aria-hidden="true" />}
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <NumField id="ageYears" label="Age (optional)" unit="years" value={form.ageYears} onChange={(v) => set('ageYears', v)} onBlur={touch('ageYears')} error={shown('ageYears')} placeholder="e.g. 2" />
        </div>
      </section>

      <section aria-labelledby="s2" className="space-y-4">
        <div>
          <h2 id="s2" className="section-title">
            <span className="step-dot" aria-hidden="true">2</span> Vitals
          </h2>
          <p className="hint ml-[2.375rem]">Leave blank anything you did not measure.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
          <NumField id="temperatureC" label="Temperature" unit="°C" value={form.temperatureC} onChange={(v) => set('temperatureC', v)} onBlur={touch('temperatureC')} error={shown('temperatureC')} placeholder="37.0" />
          <NumField id="heartRate" label="Heart rate" unit="bpm" mode="numeric" value={form.heartRate} onChange={(v) => set('heartRate', v)} onBlur={touch('heartRate')} error={shown('heartRate')} placeholder="80" />
          <NumField id="respiratoryRate" label="Resp. rate" unit="/min" mode="numeric" value={form.respiratoryRate} onChange={(v) => set('respiratoryRate', v)} onBlur={touch('respiratoryRate')} error={shown('respiratoryRate')} placeholder="20" />
          <NumField id="bloodPressure" label="Blood pressure" unit="mmHg" mode="text" value={form.bloodPressure} onChange={(v) => set('bloodPressure', v)} onBlur={touch('bloodPressure')} error={shown('bloodPressure')} placeholder="120/80" />
          <NumField id="spo2" label="SpO₂" unit="%" mode="numeric" value={form.spo2} onChange={(v) => set('spo2', v)} onBlur={touch('spo2')} error={shown('spo2')} placeholder="97" />
          <NumField id="durationDays" label="Duration" unit="days" mode="numeric" value={form.durationDays} onChange={(v) => set('durationDays', v)} onBlur={touch('durationDays')} error={shown('durationDays')} placeholder="1" />
        </div>
      </section>

      <section aria-labelledby="s3" className="space-y-3">
        <h2 id="s3" className="section-title">
          <span className="step-dot" aria-hidden="true">3</span> Symptoms
        </h2>
        <div>
          <label htmlFor="symptoms" className="label">
            What is the patient or caregiver telling you?
          </label>
          <textarea
            id="symptoms"
            ref={textRef}
            value={form.symptoms}
            maxLength={2000}
            onChange={(e) => set('symptoms', e.target.value)}
            onBlur={touch('symptoms')}
            aria-invalid={shown('symptoms') ? true : undefined}
            aria-describedby={shown('symptoms') ? 'symptoms-err' : 'symptoms-hint'}
            placeholder='In your own words, e.g. "body dey hot", "running stomach", "convulsion"'
            className="field min-h-[128px] resize-none overflow-hidden py-3"
          />
          {shown('symptoms') ? (
            <p id="symptoms-err" className="err">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {errors.symptoms}
            </p>
          ) : (
            <p id="symptoms-hint" className="hint">
              Local expressions are fine. Include anything about drinking, breathing or alertness.
            </p>
          )}
        </div>
      </section>

      {serverError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-tri-red bg-tri-redSoft p-3 text-sm font-semibold text-tri-redInk">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> {serverError}
        </p>
      )}

      <div className="sticky bottom-[4.75rem] z-10 -mx-4 rounded-b-2xl border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:p-0">
        <button type="submit" disabled={loading} className="btn-primary min-h-[56px] w-full text-lg">
          {loading ? <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" /> : <Stethoscope className="h-5 w-5" aria-hidden="true" />}
          {loading ? 'Running triage…' : 'Run triage'}
        </button>
        {loading && (
          <ol className="mt-3 space-y-1.5" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 text-sm ${i <= step ? 'font-semibold text-ink' : 'text-mute'}`}>
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4 text-tri-ok" aria-hidden="true" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-line" aria-hidden="true" />
                )}
                {s}…
              </li>
            ))}
          </ol>
        )}
      </div>
    </form>
  );
}
