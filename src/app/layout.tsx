import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { DevDebugPanel } from '@/components/dev/debug-panel';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Moodboard — Visual Inspiration Platform',
  description:
    'Create, organize, and share beautiful moodboards. Drag, drop, categorize, and discover your visual inspiration.',
  keywords: ['moodboard', 'design', 'inspiration', 'visual', 'organize'],
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
          <DevDebugPanel />
        </Providers>
      </body>
    </html>
  );
}
