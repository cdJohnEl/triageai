import type { Metadata, Viewport } from 'next';
import AppNav from '@/components/AppNav';
import SafetyBanner from '@/components/SafetyBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'TriageAI — Clinical decision support for community health workers',
  description: 'Zero-PII, protocol-grounded triage and multilingual patient handouts for CHWs.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SafetyBanner />
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:gap-6">
          <AppNav />
          <main className="min-w-0 flex-1 space-y-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
