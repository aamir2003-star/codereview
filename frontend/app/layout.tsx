import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReviewCopilot — Collaborative Real-Time AI Code Reviews',
  description: 'AI-Powered Code Review Engine and PR Architecture Breakdown with live multiplayer sync',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white font-sans relative overflow-x-hidden selection:bg-[#007acc]/20 selection:text-[#4ec9b0]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
