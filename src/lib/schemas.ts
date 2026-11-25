export const AGE_GROUPS = ['infant', 'child', 'adult', 'pregnant', 'elderly'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

export type TriageLevel = 'RED' | 'YELLOW' | 'GREEN';
export const TRIAGE_LEVELS: TriageLevel[] = ['RED', 'YELLOW', 'GREEN'];

export const LANGUAGES = ['English', 'Nigerian Pidgin', 'Igbo', 'Yoruba', 'Hausa'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Vitals {
  temperatureC?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressure?: string;
  spo2?: number;
}

export interface TriageRequest {
  ageGroup: AgeGroup;
  ageYears?: number;
  sex: Sex;
  vitals: Vitals;
  durationDays: number;
  symptoms: string;
}

export interface PatientHandout {
  title: string;
  summary: string;
  home_care_steps: string[];
  warning_signs_return_immediately: string[];
}

export interface DifferentialConsideration {
  condition: string;
  likelihood: 'High' | 'Moderate' | 'Low';
  rationale: string;
}

export interface TriageAssessment {
  triage_level: TriageLevel;
  urgency_headline: string;
  clinical_reasoning_summary: string;
  immediate_danger_signs_to_verify: string[];
  differential_considerations: DifferentialConsideration[];
  chw_action_steps: string[];
  patient_handout_english: PatientHandout;
  sbar_referral_note: string;
}

export interface TriageSessionRecord {
  id: string;
  created_at: string;
  age_group: AgeGroup;
  sex: Sex;
  vitals: Vitals;
  duration_days: number;
  symptoms_raw: string;
  triage_level: TriageLevel;
  triage_output: TriageAssessment;
}

export interface TriageResponse {
  assessment: TriageAssessment;
  latencyMs: number;
  model: string;
  sessionId: string | null;
}

export interface TranslateRequest {
  handout: PatientHandout;
  targetLanguage: Language;
}

/** Groq strict structured outputs: every object sets additionalProperties:false and lists all keys as required. */
export const HANDOUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    home_care_steps: { type: 'array', items: { type: 'string' } },
    warning_signs_return_immediately: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'summary', 'home_care_steps', 'warning_signs_return_immediately'],
  additionalProperties: false,
} as const;

export const TRIAGE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    triage_level: { type: 'string', enum: ['RED', 'YELLOW', 'GREEN'] },
    urgency_headline: { type: 'string' },
    clinical_reasoning_summary: { type: 'string' },
    immediate_danger_signs_to_verify: { type: 'array', items: { type: 'string' } },
    differential_considerations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          condition: { type: 'string' },
          likelihood: { type: 'string', enum: ['High', 'Moderate', 'Low'] },
          rationale: { type: 'string' },
        },
        required: ['condition', 'likelihood', 'rationale'],
        additionalProperties: false,
      },
    },
    chw_action_steps: { type: 'array', items: { type: 'string' } },
    patient_handout_english: HANDOUT_JSON_SCHEMA,
    sbar_referral_note: { type: 'string' },
  },
  required: [
    'triage_level',
    'urgency_headline',
    'clinical_reasoning_summary',
    'immediate_danger_signs_to_verify',
    'differential_considerations',
    'chw_action_steps',
    'patient_handout_english',
    'sbar_referral_note',
  ],
  additionalProperties: false,
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optNumber(v: unknown, min: number, max: number, label: string): number | undefined | string {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return `${label} must be a number between ${min} and ${max}`;
  return n;
}

/** Returns a validated TriageRequest or an error message string. */
export function parseTriageRequest(body: unknown): TriageRequest | string {
  if (!isRecord(body)) return 'Request body must be a JSON object';
  const { ageGroup, sex, vitals, durationDays, symptoms, ageYears } = body;

  if (typeof ageGroup !== 'string' || !(AGE_GROUPS as readonly string[]).includes(ageGroup)) return 'Invalid ageGroup';
  if (typeof sex !== 'string' || !(SEXES as readonly string[]).includes(sex)) return 'Invalid sex';
  if (typeof symptoms !== 'string' || symptoms.trim().length < 3) return 'Please describe the symptoms';
  if (symptoms.length > 2000) return 'Symptom description is too long (max 2000 characters)';

  const dur = typeof durationDays === 'number' ? durationDays : Number(durationDays ?? 1);
  if (!Number.isFinite(dur) || dur < 0 || dur > 365) return 'durationDays must be between 0 and 365';

  const v = isRecord(vitals) ? vitals : {};
  const temperatureC = optNumber(v.temperatureC, 30, 45, 'Temperature');
  const heartRate = optNumber(v.heartRate, 20, 300, 'Heart rate');
  const respiratoryRate = optNumber(v.respiratoryRate, 5, 120, 'Respiratory rate');
  const spo2 = optNumber(v.spo2, 40, 100, 'SpO₂');
  const years = optNumber(ageYears, 0, 120, 'Age');
  for (const r of [temperatureC, heartRate, respiratoryRate, spo2, years]) {
    if (typeof r === 'string') return r;
  }

  let bloodPressure: string | undefined;
  if (typeof v.bloodPressure === 'string' && v.bloodPressure.trim() !== '') {
    const m = v.bloodPressure.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
    if (!m) return 'Blood pressure must look like 120/80';
    bloodPressure = `${m[1]}/${m[2]}`;
  }

  const cleanVitals: Vitals = {};
  if (typeof temperatureC === 'number') cleanVitals.temperatureC = temperatureC;
  if (typeof heartRate === 'number') cleanVitals.heartRate = heartRate;
  if (typeof respiratoryRate === 'number') cleanVitals.respiratoryRate = respiratoryRate;
  if (typeof spo2 === 'number') cleanVitals.spo2 = spo2;
  if (bloodPressure) cleanVitals.bloodPressure = bloodPressure;

  return {
    ageGroup: ageGroup as AgeGroup,
    ageYears: typeof years === 'number' ? years : undefined,
    sex: ageGroup === 'pregnant' ? 'female' : (sex as Sex),
    vitals: cleanVitals,
    durationDays: Math.round(dur),
    symptoms: symptoms.trim(),
  };
}

export function isPatientHandout(v: unknown): v is PatientHandout {
  return (
    isRecord(v) &&
    typeof v.title === 'string' &&
    typeof v.summary === 'string' &&
    Array.isArray(v.home_care_steps) &&
    v.home_care_steps.every((s) => typeof s === 'string') &&
    Array.isArray(v.warning_signs_return_immediately) &&
    v.warning_signs_return_immediately.every((s) => typeof s === 'string')
  );
}

export function isTriageAssessment(v: unknown): v is TriageAssessment {
  return (
    isRecord(v) &&
    typeof v.triage_level === 'string' &&
    (TRIAGE_LEVELS as string[]).includes(v.triage_level) &&
    typeof v.urgency_headline === 'string' &&
    typeof v.clinical_reasoning_summary === 'string' &&
    Array.isArray(v.immediate_danger_signs_to_verify) &&
    Array.isArray(v.differential_considerations) &&
    Array.isArray(v.chw_action_steps) &&
    isPatientHandout(v.patient_handout_english) &&
    typeof v.sbar_referral_note === 'string'
  );
}
