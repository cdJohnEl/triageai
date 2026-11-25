'use client';

import { useEffect, useRef, useState } from 'react';
import IntakeForm from '@/components/IntakeForm';
import TriageResultCard from '@/components/TriageResultCard';
import type { TriageResponse } from '@/lib/schemas';

export default function HomePage() {
  const [result, setResult] = useState<TriageResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  return (
    <>
      <header className="flex items-center gap-5 px-1">
        <span className="orb h-16 w-16 shrink-0 rounded-full" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-light leading-tight tracking-tight text-slate-900 sm:text-4xl">Who are you seeing today?</h1>
          <p className="mt-1 text-base text-slate-700">Enter what you have. Partial vitals are fine.</p>
        </div>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <IntakeForm onResult={setResult} />
        {result && (
          <div ref={resultRef} className="xl:sticky xl:top-20">
            <TriageResultCard assessment={result.assessment} latencyMs={result.latencyMs} resetKey={result.sessionId ?? String(result.latencyMs)} />
          </div>
        )}
      </div>
    </>
  );
}
