import Groq from 'groq-sdk';
import type { TriageRequest } from './schemas';

export const TRIAGE_MODEL = 'openai/gpt-oss-120b';
export const TRANSLATE_MODEL = 'openai/gpt-oss-20b';

let client: Groq | null = null;

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured. Add it to .env.local and restart the server.');
  }
  if (!client) client = new Groq({ apiKey });
  return client;
}

const AGE_LABEL: Record<TriageRequest['ageGroup'], string> = {
  infant: 'Infant (0-11 months)',
  child: 'Child (1-12 years)',
  adult: 'Adult (13-59 years)',
  pregnant: 'Pregnant woman',
  elderly: 'Elderly (60+ years)',
};

export function formatPatientMessage(req: TriageRequest): string {
  const v = req.vitals;
  const val = (x: number | string | undefined, unit: string): string =>
    x === undefined ? 'not measured' : `${x}${unit}`;
  return [
    'Assess this patient.',
    `Age group: ${AGE_LABEL[req.ageGroup]}${req.ageYears !== undefined ? ` (stated age: ${req.ageYears} years)` : ''}`,
    `Sex: ${req.sex}`,
    `Temperature: ${val(v.temperatureC, ' C')}`,
    `Heart rate: ${val(v.heartRate, ' bpm')}`,
    `Respiratory rate: ${val(v.respiratoryRate, ' breaths/min')}`,
    `Blood pressure: ${val(v.bloodPressure, ' mmHg')}`,
    `SpO2: ${val(v.spo2, '%')}`,
    `Symptom duration: ${req.durationDays} day(s)`,
    `Symptoms (CHW narrative, verbatim): "${req.symptoms}"`,
  ].join('\n');
}
