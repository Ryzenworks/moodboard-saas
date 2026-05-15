import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-16 border-b border-white/[0.04]">
        <span className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
          Moodboard
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 h-9 inline-flex items-center text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 h-9 inline-flex items-center text-sm font-medium bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover transition-all shadow-[0_0_20px_rgba(5,109,250,0.15)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-up space-y-6 max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            Now in Beta
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Your visual
            <br />
            <span className="bg-gradient-to-r from-accent via-blue-400 to-accent bg-clip-text text-transparent">
              inspiration hub
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Create stunning moodboards, organize with categories, extract color
            palettes — all in one beautiful workspace.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="px-8 h-12 inline-flex items-center text-sm font-medium bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover transition-all shadow-[0_0_30px_rgba(5,109,250,0.2)] hover:shadow-[0_0_40px_rgba(5,109,250,0.3)]"
            >
              Start for Free
            </Link>
            <Link
              href="/login"
              className="px-8 h-12 inline-flex items-center text-sm font-medium text-white/70 hover:text-white border border-white/[0.1] hover:border-white/[0.2] rounded-[var(--radius-md)] transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Free</span> to start
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">3</span> boards included
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              No credit card
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
