'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Stethoscope } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'New triage', Icon: Stethoscope },
  { href: '/history', label: 'Shift log', Icon: History },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <aside className="glass flex items-center justify-between gap-3 p-3 lg:sticky lg:top-20 lg:w-60 lg:shrink-0 lg:flex-col lg:items-stretch lg:self-start lg:p-5">
      <Link href="/" className="flex min-h-[48px] items-center gap-3 px-1">
        <span className="orb h-9 w-9 rounded-full" aria-hidden="true" />
        <span className="text-xl font-semibold tracking-tight text-slate-900">TriageAI</span>
      </Link>
      <nav aria-label="Main" className="flex gap-1 lg:flex-col lg:gap-2 lg:pt-3">
        <p className="hidden px-3 text-xs text-slate-600 lg:block">General</p>
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[48px] items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                active ? 'bg-white text-slate-900 shadow ring-1 ring-white' : 'text-slate-800 hover:bg-white/60'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-moss-700' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <p className="hidden px-3 text-xs leading-relaxed text-slate-600 lg:block">
        Anonymous by design. No names, phone numbers or addresses are stored.
      </p>
    </aside>
  );
}
