'use client';

import { useEffect, useRef, useState } from 'react';
import IntakeForm from '@/components/IntakeForm';
import TriageResultCard from '@/components/TriageResultCard';
import type { TriageResponse } from '@/lib/schemas';

export default function HomePage() {
  const [result, setResult] = useState<TriageResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result) return;
    const el = resultRef.current;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el?.focus({ preventScroll: true });
  }, [result]);

  return (
    <>
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">New triage</h1>
        <p className="mt-1 text-base text-mute">Enter what you have. Partial vitals are fine, and nothing identifying is stored.</p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <IntakeForm onResult={setResult} />
        {result && (
          <div ref={resultRef} tabIndex={-1} className="scroll-mt-20 outline-none xl:sticky xl:top-20">
            <TriageResultCard assessment={result.assessment} latencyMs={result.latencyMs} resetKey={result.sessionId ?? String(result.latencyMs)} />
          </div>
        )}
      </div>
    </>
  );
}
