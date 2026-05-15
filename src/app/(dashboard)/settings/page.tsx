'use client';

import { Topbar } from '@/components/layout/topbar';
import { useAuthStore } from '@/store/auth';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 p-6 max-w-2xl">
        <div className="bg-card border border-white/[0.06] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-bold">
              {user?.fullName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-sm font-semibold">{user?.fullName || 'User'}</h2>
              <p className="text-xs text-white/30">{user?.email}</p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6">
            <div className="flex items-center gap-3 text-white/20">
              <Settings className="w-5 h-5" />
              <p className="text-sm">More settings coming in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
