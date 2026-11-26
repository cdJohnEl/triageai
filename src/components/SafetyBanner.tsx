import { ShieldAlert } from 'lucide-react';

export default function SafetyBanner() {
  return (
    <div role="note" aria-label="Safety notice" className="sticky top-0 z-50 flex items-start gap-2.5 bg-ink px-4 py-2.5 text-sm font-medium text-white">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-tri-amber" aria-hidden="true" />
      <p>Clinical Decision Support Only — Verify all danger signs physically. Does not replace licensed physician judgment.</p>
    </div>
  );
}
