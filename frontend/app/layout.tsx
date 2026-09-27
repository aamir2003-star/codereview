import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ThreeDCanvas } from '@/components/ui/ThreeDCanvas';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReviewCopilot — Collaborative Real-Time AI Code Reviews',
  description: 'AI-Powered Code Review Engine powered by Gemini 2.0 and live multiplayer Socket.io sync',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans relative overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-300">
        <ThreeDCanvas />
        <div className="relative z-10 flex min-h-screen flex-col">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
