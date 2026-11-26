'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2, MessageCircle, Printer, X } from 'lucide-react';
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

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function HandoutModal({ handout, onClose }: Props) {
  const [language, setLanguage] = useState<Language>('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setVersion] = useState(0);
  const cache = useRef<Map<Language, PatientHandout>>(new Map([['English', handout]]));
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    cache.current = new Map([['English', handout]]);
    setLanguage('English');
    setVersion((v) => v + 1);
  }, [handout]);

  // Focus management: move focus in, trap Tab, close on Escape, restore focus on close.
  const close = useCallback(() => {
    onClose();
    opener.current?.focus();
  }, [onClose]);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close]);

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(15,42,34,0.6)] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="handout-title" className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 id="handout-title" className="text-lg font-bold text-ink">
            Patient handout
          </h2>
          <button type="button" data-autofocus onClick={close} aria-label="Close handout" className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 hover:bg-surface2">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto p-4 pb-2" role="radiogroup" aria-label="Language">
          {LANGUAGES.map((l) => {
            const on = language === l;
            return (
              <button key={l} type="button" role="radio" aria-checked={on} onClick={() => choose(l)} className={`chip shrink-0 ${on ? 'chip-on' : ''}`}>
                {on && <Check className="h-4 w-4" aria-hidden="true" />}
                {l}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2" aria-live="polite">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-mute">
              <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" /> Translating to {language}…
            </div>
          ) : (
            <article className="space-y-4 text-lg leading-relaxed text-ink">
              <h3 className="text-xl font-extrabold">{current.title}</h3>
              <p>{current.summary}</p>
              <div>
                <h4 className="mb-1 font-bold">Home care</h4>
                <ol className="list-decimal space-y-1.5 pl-6">
                  {current.home_care_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
              <div className="rounded-xl border-2 border-tri-red bg-tri-redSoft p-4">
                <h4 className="mb-1 flex items-center gap-2 font-bold text-tri-redInk">
                  <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> Go to the clinic or hospital immediately if:
                </h4>
                <ul className="list-disc space-y-1.5 pl-6 text-tri-redInk">
                  {current.warning_signs_return_immediately.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </article>
          )}
          {error && (
            <p role="alert" className="err mt-3 rounded-xl border-2 border-tri-red bg-tri-redSoft p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-line p-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-tri-ok px-2 text-sm text-white hover:bg-tri-okInk"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp
          </a>
          <button type="button" onClick={copy} className="btn-secondary px-2 text-sm">
            {copied ? <Check className="h-5 w-5 text-tri-ok" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={print} className="btn-secondary px-2 text-sm">
            <Printer className="h-5 w-5" aria-hidden="true" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
