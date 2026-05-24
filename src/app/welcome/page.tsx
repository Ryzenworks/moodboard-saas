'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Sparkles,
  Image as ImageIcon,
  Globe,
  Layers,
  MousePointer2,
  Download,
  RefreshCw,
  Copy,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { MoodboardLogo } from '@/components/ui/logo';
import { PlanCard } from '@/components/billing/plan-card';
import { useAuthStore } from '@/store/auth';
import { profileService } from '@/services/profile';
import { useExtension } from '@/hooks/use-extension';
import { UpgradeModal } from '@/components/billing/upgrade-modal';

const STEPS = ['welcome', 'extension', 'plans', 'demo'] as const;
type Step = (typeof STEPS)[number];

export default function WelcomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const [step, setStep] = useState<Step>('welcome');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { status: extStatus, recheck: recheckExt } = useExtension();
  const [copied, setCopied] = useState(false);

  // Check if onboarding is already complete
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      profileService.getOnboardingStatus(user.id).then((done) => {
        if (done) router.replace('/boards');
      });
    }
  }, [user, loading, router]);

  function handleContinueFree() {
    if (!user || completing) return;
    setCompleting(true);
    console.log('[Onboarding] Completing...');

    // Synchronous — sets cookie immediately (middleware reads this)
    profileService.completeOnboarding(user.id);
    console.log('[Onboarding] Cookie set → redirecting to /boards');

    // Redirect immediately — cookie ensures middleware won't bounce back
    router.replace('/boards');
  }

  function handleUpgrade() {
    setUpgradeOpen(true);
  }

  function nextStep() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 relative overflow-x-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6 relative z-10">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
              i === stepIndex
                ? 'bg-accent w-6'
                : i < stepIndex
                ? 'bg-accent/40'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="relative z-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
                <MoodboardLogo size={14} className="text-accent" />
                <span className="text-[11px] font-medium text-accent">Welcome to Moodboard</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                Your visual inspiration hub
              </h1>

              <p className="text-base text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
                Capture, organize, and revisit your creative inspiration — all in one place.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-10">
                {[
                  { icon: Globe, label: 'Save from any website' },
                  { icon: ImageIcon, label: 'YouTube thumbnails' },
                  { icon: Layers, label: 'Organize visually' },
                  { icon: Sparkles, label: 'X/Twitter inspiration' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <Icon className="w-4 h-4 text-accent/70 flex-shrink-0" />
                    <span className="text-[12px] text-white/50">{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 'extension' && (
            <motion.div
              key="extension"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">
                Install the Extension
              </h2>
              <p className="text-sm text-white/35 mb-6">
                Save images from any website with one right-click.
              </p>

              {/* ── Status Badge ── */}
              <div className="flex justify-center mb-6">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold ${
                  extStatus === 'connected'
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : extStatus === 'installed'
                    ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                    : extStatus === 'loading'
                    ? 'bg-white/[0.03] border border-white/[0.06] text-white/25'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    extStatus === 'connected' ? 'bg-green-400'
                      : extStatus === 'installed' ? 'bg-yellow-400'
                      : extStatus === 'loading' ? 'bg-white/20 animate-pulse'
                      : 'bg-red-400/60'
                  }`} />
                  {extStatus === 'connected' ? 'Connected'
                    : extStatus === 'installed' ? 'Installed — not connected'
                    : extStatus === 'loading' ? 'Detecting...'
                    : 'Not detected'}
                </div>
              </div>

              {/* ── Connected State ── */}
              {extStatus === 'connected' ? (
                <div className="max-w-sm mx-auto mb-8 p-6 rounded-2xl bg-green-500/[0.04] border border-green-500/10">
                  <CheckCircle2 className="w-10 h-10 text-green-400/80 mx-auto mb-3" />
                  <p className="text-sm font-medium text-white/80 mb-1">Extension is ready</p>
                  <p className="text-xs text-white/30">Right-click any image on the web to save it.</p>
                </div>
              ) : (
                <>
                  {/* ── Download + Install Card ── */}
                  <div className="max-w-md mx-auto mb-6 p-5 rounded-2xl bg-white/[0.025] border border-white/[0.07]">
                    {/* Step 1: Download */}
                    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-accent/10 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium text-white/70 mb-2">Download the extension</p>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = '/api/extension/download';
                            a.download = 'moodboard-extension.zip';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/90 hover:bg-accent text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download ZIP
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Unzip */}
                    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] text-white/40 text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium text-white/70">Extract the ZIP file</p>
                        <p className="text-[11px] text-white/25 mt-0.5">Unzip to any folder on your computer.</p>
                      </div>
                    </div>

                    {/* Step 3: Open extensions page */}
                    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] text-white/40 text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium text-white/70 mb-2">Open Chrome extensions page</p>
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] text-accent/70 bg-accent/[0.06] px-2.5 py-1 rounded-md font-mono select-all">chrome://extensions</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText('chrome://extensions');
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all cursor-pointer"
                            title="Copy URL"
                          >
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/25" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-white/15 mt-1.5">Paste this into your Chrome address bar.</p>
                      </div>
                    </div>

                    {/* Step 4: Load unpacked */}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] text-white/40 text-[11px] font-bold flex items-center justify-center mt-0.5">4</span>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium text-white/70">Enable Developer Mode → Load unpacked</p>
                        <p className="text-[11px] text-white/25 mt-0.5">Toggle Developer Mode (top-right), then select the extracted folder.</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Check Again ── */}
                  <div className="max-w-md mx-auto mb-6 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
                    <RefreshCw className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    <p className="text-[11px] text-white/25 flex-1 text-left">
                      After installing, refresh this page or click check.
                    </p>
                    <button
                      onClick={() => recheckExt()}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-medium text-white/50 hover:text-white/80 transition-all cursor-pointer flex-shrink-0"
                    >
                      Check Again
                    </button>
                  </div>
                </>
              )}

              {/* ── Navigation ── */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all cursor-pointer"
                >
                  {extStatus === 'connected' ? 'Continue' : 'Skip for now'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">
                Choose your plan
              </h2>
              <p className="text-sm text-white/35 mb-8">
                Start free, upgrade anytime.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <PlanCard
                  name="Free"
                  price="Free"
                  features={[
                    '1 board',
                    '50 uploads',
                    '500 MB storage',
                    'Browser extension',
                    'Real-time sync',
                  ]}
                  onSelect={handleContinueFree}
                  loading={completing}
                  ctaLabel="Continue Free"
                />
                <PlanCard
                  name="Pro"
                  price="₹499"
                  period="/month"
                  recommended
                  features={[
                    'Up to 10 boards',
                    'Unlimited uploads',
                    'Unlimited storage',
                    'Multi-board workflow',
                    'Priority support',
                  ]}
                  onSelect={handleUpgrade}
                />
              </div>

              <button
                onClick={prevStep}
                className="px-5 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-all cursor-pointer"
              >
                Back
              </button>
            </motion.div>
          )}

          {step === 'demo' && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-3 text-white">
                How it works
              </h2>
              <p className="text-sm text-white/35 mb-8">
                Three steps to build your visual library.
              </p>

              {/* Demo cards */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
                {[
                  {
                    num: '1',
                    title: 'Browse',
                    desc: 'Find inspiration anywhere on the web',
                    icon: Globe,
                  },
                  {
                    num: '2',
                    title: 'Save',
                    desc: 'Right-click → Save to Moodboard',
                    icon: MousePointer2,
                  },
                  {
                    num: '3',
                    title: 'Organize',
                    desc: 'Tag, filter, and revisit anytime',
                    icon: Layers,
                  },
                ].map(({ num, title, desc, icon: Icon }) => (
                  <div
                    key={num}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/[0.08] border border-accent/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-accent/60" />
                    </div>
                    <p className="text-sm font-semibold text-white/80 mb-1">{title}</p>
                    <p className="text-[10px] text-white/25 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleContinueFree}
                  disabled={completing}
                  className="h-[44px] flex items-center justify-center gap-2 px-6 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                >
                  {completing ? 'Setting up...' : 'Start Creating'}
                  {!completing && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip link */}
      <div className="mt-4 relative z-10">
        <button
          onClick={handleContinueFree}
          className="text-[11px] text-white/15 hover:text-white/30 transition-all cursor-pointer"
        >
          Skip onboarding
        </button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="onboarding" />

    </div>
  );
}
