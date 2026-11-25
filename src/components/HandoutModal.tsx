'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, MessageCircle, Printer, X } from 'lucide-react';
import { LANGUAGES, isPatientHandout, type Language, type PatientHandout } from '@/lib/schemas';

interface Props {
  handout: PatientHandout;
  onClose: () => void;
}

export function formatHandoutText(h: PatientHandout): string {
  const steps = h.home_care_steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const warnings = h.warning_signs_return_immediately.map((s) => `• ${s}`).join('\n');
  return `*${h.title}*\n\n${h.summary}\n\n*Home care*\n${steps}\n\n*Go to the clinic or hospital immediately if:*\n${warnings}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function HandoutModal({ handout, onClose }: Props) {
  const [language, setLanguage] = useState<Language>('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setVersion] = useState(0);
  const cache = useRef<Map<Language, PatientHandout>>(new Map([['English', handout]]));

  useEffect(() => {
    cache.current = new Map([['English', handout]]);
    setLanguage('English');
    setVersion((v) => v + 1);
  }, [handout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function choose(lang: Language) {
    setError(null);
    setLanguage(lang);
    if (cache.current.has(lang)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handout, targetLanguage: lang }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Translation failed');
      const translated = (data as { handout?: unknown }).handout;
      if (!isPatientHandout(translated)) throw new Error('Translation was incomplete');
      cache.current.set(lang, translated);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setLanguage('English');
    } finally {
      setLoading(false);
    }
  }

  const current = cache.current.get(language) ?? handout;
  const text = formatHandoutText(current);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text.replace(/\*/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy is not available in this browser.');
    }
  }

  function print() {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) {
      setError('Allow pop-ups to print the handout.');
      return;
    }
    const li = (a: string[]) => a.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(current.title)}</title>
<style>body{font-family:system-ui,sans-serif;font-size:18px;line-height:1.5;padding:24px;max-width:560px}h1{font-size:24px}h2{font-size:19px;margin-top:20px}.warn{border:3px solid #b91c1c;padding:8px 16px;margin-top:20px}</style></head>
<body><h1>${escapeHtml(current.title)}</h1><p>${escapeHtml(current.summary)}</p><h2>Home care</h2><ol>${li(current.home_care_steps)}</ol>
<div class="warn"><h2 style="margin-top:8px">Go to the clinic or hospital immediately if:</h2><ul>${li(current.warning_signs_return_immediately)}</ul></div></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center" role="dialog" aria-modal="true" aria-label="Patient handout">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col glass-strong rounded-t-[2rem] sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-white/70 p-4">
          <h2 className="text-lg font-bold text-slate-900">Patient handout</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto p-4 pb-2" role="tablist" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={language === l}
              onClick={() => choose(l)}
              className={`chip shrink-0 ${language === l ? 'chip-on' : ''}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-slate-700" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin" /> Translating to {language}...
            </div>
          ) : (
            <article className="space-y-4 text-base leading-relaxed text-slate-900">
              <h3 className="text-xl font-bold">{current.title}</h3>
              <p>{current.summary}</p>
              <div>
                <h4 className="mb-1 font-bold">Home care</h4>
                <ol className="list-decimal space-y-1 pl-6">
                  {current.home_care_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
              <div className="rounded-xl border-2 border-red-600 bg-red-50 p-3">
                <h4 className="mb-1 font-bold text-red-800">Go to the clinic or hospital immediately if:</h4>
                <ul className="list-disc space-y-1 pl-5 text-red-900">
                  {current.warning_signs_return_immediately.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </article>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/70 p-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp
          </a>
          <button type="button" onClick={copy} className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-white/80 bg-white/60 px-2 text-sm font-bold text-slate-900 hover:border-moss-700">
            {copied ? <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={print} className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-white/80 bg-white/60 px-2 text-sm font-bold text-slate-900 hover:border-moss-700">
            <Printer className="h-5 w-5" aria-hidden="true" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
