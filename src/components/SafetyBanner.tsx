import { ShieldAlert } from 'lucide-react';

export default function SafetyBanner() {
  return (
    <div role="alert" className="sticky top-0 z-40 flex items-start gap-2 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
      <p>Clinical Decision Support Only — Verify all danger signs physically. Does not replace licensed physician judgment.</p>
    </div>
  );
}
