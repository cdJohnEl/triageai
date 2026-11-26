'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Stethoscope } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'New triage', Icon: Stethoscope },
  { href: '/history', label: 'Shift log', Icon: ClipboardList },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <>
      <aside className="card hidden w-60 shrink-0 self-start p-4 lg:sticky lg:top-20 lg:block">
        <Link href="/" className="mb-5 flex min-h-[48px] items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white" aria-hidden="true">
            <Stethoscope className="h-6 w-6" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink">TriageAI</span>
        </Link>
        <nav aria-label="Main" className="space-y-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-base font-semibold transition-colors duration-150 ${
                  active ? 'bg-brand-soft text-brand-dark' : 'text-ink hover:bg-surface2'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" /> {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-6 border-t border-line px-1 pt-4 text-sm leading-relaxed text-mute">
          Anonymous by design. No names, phone numbers or addresses are ever stored.
        </p>
      </aside>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-colors duration-150 ${
                active ? 'text-brand-dark' : 'text-mute'
              }`}
            >
              <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-brand-soft' : ''}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
