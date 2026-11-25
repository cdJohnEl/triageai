import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type { TriageLevel, TriageSessionRecord } from './schemas';

export type NewSession = Omit<TriageSessionRecord, 'id' | 'created_at'>;
export type StorageBackend = 'firebase' | 'local';

const COLLECTION = 'triage_sessions';
const LOCAL_FILE = path.join(os.tmpdir(), 'triageai-sessions.json');
const MAX_LOCAL = 500;

let db: Firestore | null | undefined;

function getDb(): Firestore | null {
  if (db !== undefined) return db;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) {
    db = null;
    return db;
  }
  const app: FirebaseApp = getApps().length
    ? getApp()
    : initializeApp({
        apiKey,
        projectId,
        appId,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      });
  db = getFirestore(app);
  return db;
}

export function getBackend(): StorageBackend {
  return getDb() ? 'firebase' : 'local';
}

// In-memory store survives hot reloads via globalThis; a temp file keeps it across restarts.
const g = globalThis as unknown as { __triageLocal?: TriageSessionRecord[] };

async function loadLocal(): Promise<TriageSessionRecord[]> {
  if (g.__triageLocal) return g.__triageLocal;
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    g.__triageLocal = Array.isArray(parsed) ? (parsed as TriageSessionRecord[]) : [];
  } catch {
    g.__triageLocal = [];
  }
  return g.__triageLocal;
}

async function persistLocal(rows: TriageSessionRecord[]): Promise<void> {
  try {
    await fs.writeFile(LOCAL_FILE, JSON.stringify(rows), 'utf8');
  } catch {
    // Read-only filesystem (some hosts): keep the in-memory copy only.
  }
}

export async function saveSession(input: NewSession): Promise<TriageSessionRecord> {
  const firestore = getDb();
  const created_at = new Date().toISOString();
  if (firestore) {
    try {
      const ref = await addDoc(collection(firestore, COLLECTION), { ...input, created_at });
      return { ...input, id: ref.id, created_at };
    } catch (err) {
      console.error('Firestore write failed, using local fallback:', err instanceof Error ? err.message : err);
    }
  }
  const record: TriageSessionRecord = { ...input, id: randomUUID(), created_at };
  const rows = await loadLocal();
  rows.unshift(record);
  if (rows.length > MAX_LOCAL) rows.length = MAX_LOCAL;
  await persistLocal(rows);
  return record;
}

export async function listSessions(level?: TriageLevel): Promise<TriageSessionRecord[]> {
  const firestore = getDb();
  let rows: TriageSessionRecord[] | null = null;
  if (firestore) {
    try {
      // Ordered query only (no composite index needed); level filtering happens in memory.
      const snap = await getDocs(query(collection(firestore, COLLECTION), orderBy('created_at', 'desc'), limit(200)));
      rows = snap.docs.map((d) => ({ ...(d.data() as Omit<TriageSessionRecord, 'id'>), id: d.id }));
    } catch (err) {
      console.error('Firestore read failed, using local fallback:', err instanceof Error ? err.message : err);
    }
  }
  if (!rows) rows = [...(await loadLocal())];
  return level ? rows.filter((r) => r.triage_level === level) : rows;
}
