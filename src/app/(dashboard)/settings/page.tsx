'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { UsageBar } from '@/components/billing/usage-bar';
import { useAuthStore } from '@/store/auth';
import { useExtension } from '@/hooks/use-extension';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  Puzzle,
  BarChart3,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  Copy,
  ExternalLink,
  LogOut,
  Trash2,
  Download,
} from 'lucide-react';

// ── Section card ──
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-white/[0.06] rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.04]">
        <Icon className="w-4 h-4 text-white/25" />
        <h2 className="text-[13px] font-semibold text-white/50 tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </motion.section>
  );
}

// ── Row ──
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between min-h-[36px] gap-4">
      <div>
        <span className="text-[13px] text-white/60">{label}</span>
        {sub && <span className="block text-[11px] text-white/20 mt-0.5">{sub}</span>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Badge ──
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'danger' | 'accent' | 'warning' }) {
  const colors = {
    default: 'bg-white/[0.06] text-white/40',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    accent: 'bg-accent/10 text-accent border border-accent/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ── Small button ──
function SmallBtn({ children, onClick, variant = 'default', disabled }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'default' | 'danger'; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'bg-red-500/10 text-red-300/80 hover:bg-red-500/20 border border-red-500/15'
          : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1] border border-white/[0.06]'
      }`}
    >
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { plan, boardCount, imageCount, limits, isPro } = usePlan();
  const { status: extStatus, email: extEmail, recheck: recheckExt } = useExtension();
  const { signOut } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  function handleDisconnectExt() {
    setConfirmModal({
      title: 'Disconnect Extension',
      message: 'This will unlink the Chrome extension from your account. You can reconnect anytime.',
      onConfirm: () => {
        window.postMessage({ source: 'moodboard-web', type: 'DISCONNECT' }, '*');
        setTimeout(() => recheckExt(), 500);
      },
    });
  }

  function handleSignOut() {
    setConfirmModal({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: () => signOut(),
    });
  }

  if (!mounted) return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 p-6 max-w-2xl" />
    </>
  );

  return (
    <>
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-2xl space-y-4 pb-20">

        {/* ── Extension ── */}
        <Section icon={Puzzle} title="Extension">
          <Row label="Status">
            {extStatus === 'connected' && (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
            {extStatus === 'installed' && (
              <Badge variant="warning">Installed · Not linked</Badge>
            )}
            {extStatus === 'not_installed' && (
              <Badge variant="danger">
                <XCircle className="w-3 h-3 mr-1" /> Not detected
              </Badge>
            )}
            {extStatus === 'loading' && <Badge>Detecting...</Badge>}
          </Row>

          {extEmail && (
            <Row label="Linked account">
              <span className="text-[12px] text-white/40 font-mono">{extEmail}</span>
            </Row>
          )}

          {/* Download + Install */}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4 space-y-3">
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = '/api/extension/download';
                a.download = 'moodboard-extension.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[13px] font-medium hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Extension
            </button>

            <div className="space-y-1.5">
              <p className="text-[11px] text-white/25 font-medium">Install</p>
              <ol className="text-[11px] text-white/20 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Unzip the downloaded file</li>
                <li>
                  Open{' '}
                  <button onClick={() => copyText('chrome://extensions', 'ext-url')} className="text-accent/50 hover:text-accent cursor-pointer transition-colors">
                    {copied === 'ext-url' ? '✓ Copied' : 'chrome://extensions'}
                  </button>
                </li>
                <li>Enable <span className="text-white/35">Developer Mode</span> (top right)</li>
                <li>Click <span className="text-white/35">Load unpacked</span> → select the folder</li>
              </ol>
            </div>

            {extStatus !== 'not_installed' && (
              <p className="text-[10px] text-white/15">After updating, click the refresh icon in chrome://extensions to reload.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <SmallBtn onClick={recheckExt}>
              <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Recheck</span>
            </SmallBtn>

            {(extStatus === 'not_installed' || extStatus === 'installed') && (
              <SmallBtn onClick={() => window.open('/extension-auth', '_blank')}>
                <span className="flex items-center gap-1.5"><ExternalLink className="w-3 h-3" /> Connect</span>
              </SmallBtn>
            )}

            {extStatus === 'connected' && (
              <SmallBtn onClick={handleDisconnectExt} variant="danger">
                <span className="flex items-center gap-1.5"><Unplug className="w-3 h-3" /> Disconnect</span>
              </SmallBtn>
            )}
          </div>
        </Section>

        {/* ── Usage & Limits ── */}
        <Section icon={BarChart3} title="Usage & Limits">
          <Row label="Plan">
            <Badge variant={isPro ? 'accent' : 'default'}>{plan.toUpperCase()}</Badge>
          </Row>

          <div className="space-y-3">
            <UsageBar label="Boards" current={boardCount} max={limits.maxBoards} />
            <UsageBar label="Uploads" current={imageCount} max={limits.maxUploads} />
          </div>
        </Section>

        {/* ── Account ── */}
        <Section icon={User} title="Account">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full border border-white/[0.06]" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-base font-bold">
                {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold truncate">{user?.fullName || 'User'}</h3>
                <Badge variant={isPro ? 'accent' : 'default'}>{isPro ? 'PRO' : 'FREE'}</Badge>
              </div>
              <p className="text-[12px] text-white/30 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-3">
            <Row label="Email">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-white/40 font-mono truncate max-w-[180px]">{user?.email}</span>
                <button
                  onClick={() => copyText(user?.email || '', 'email')}
                  className="text-white/15 hover:text-white/40 transition-colors cursor-pointer"
                >
                  {copied === 'email' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </Row>
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <Section icon={AlertTriangle} title="Danger Zone">
          {extStatus === 'connected' && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[13px] text-white/60">Disconnect extension</p>
                <p className="text-[11px] text-white/20">Unlink the Chrome extension</p>
              </div>
              <SmallBtn onClick={handleDisconnectExt} variant="danger">
                <span className="flex items-center gap-1.5"><Unplug className="w-3 h-3" /> Disconnect</span>
              </SmallBtn>
            </div>
          )}

          <div className={`flex items-center justify-between py-1 ${extStatus === 'connected' ? 'border-t border-white/[0.04] pt-3' : ''}`}>
            <div>
              <p className="text-[13px] text-white/60">Sign out</p>
              <p className="text-[11px] text-white/20">Log out of your account</p>
            </div>
            <SmallBtn onClick={handleSignOut} variant="danger">
              <span className="flex items-center gap-1.5"><LogOut className="w-3 h-3" /> Sign Out</span>
            </SmallBtn>
          </div>

          <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between py-1 opacity-40">
            <div>
              <p className="text-[13px] text-white/60">Delete account</p>
              <p className="text-[11px] text-white/20">Permanently remove all data</p>
            </div>
            <SmallBtn disabled variant="danger">
              <span className="flex items-center gap-1.5"><Trash2 className="w-3 h-3" /> Delete</span>
            </SmallBtn>
          </div>
        </Section>
      </div>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
        onClose={() => setConfirmModal(null)}
      />
    </>
  );
}
