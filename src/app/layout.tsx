import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B0E14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'PrivacyLayer — The Privacy Layer for AI',
  description:
    'Shield your sensitive data before it reaches AI. Paste into ChatGPT, Claude, Gemini, Cursor or any LLM — then reveal original values in your response. The privacy layer for every AI conversation.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aquire1 Privacy',
  },
  keywords: [
    'AI Privacy',
    'Privacy Layer',
    'Prompt Privacy',
    'LLM Privacy',
    'PII Protection',
    'API Key Protection',
    'ChatGPT Privacy',
    'Claude Privacy',
    'Gemini Privacy',
    'Cursor Privacy',
    'Shield Prompt',
    'Reveal Response',
    'Data Masking',
  ],
  authors: [{ name: 'PrivacyLayer' }],
  openGraph: {
    title: 'PrivacyLayer — The Privacy Layer for AI',
    description: 'Shield sensitive data before it reaches AI. Reveal it only after the AI has finished.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-grey-900 text-grey-100 antialiased font-sans selection:bg-gold-500/30 selection:text-gold-100 gold-grid pb-20 md:pb-0">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

