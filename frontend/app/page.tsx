import { Navbar } from '@/components/Navbar';
import { CinematicHero } from '@/components/hero/CinematicHero';
import { FeatureScroll } from '@/components/FeatureScroll';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-neutral-100">
      <Navbar />
      <main className="flex-1">
        <CinematicHero />
        <FeatureScroll />
      </main>
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-8 text-center text-xs text-neutral-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} ReviewCopilot. Collaborative AI Code Reviews.</p>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-neutral-300 transition-colors">
              Features
            </a>
            <a
              href="https://github.com/aamir2003-star"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
