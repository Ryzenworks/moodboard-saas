/**
 * Dashboard loading shell.
 *
 * Next.js renders this INSTANTLY during client-side navigation
 * while the middleware runs server-side (supabase.auth.getUser).
 * This eliminates the perceived "dead time" between onboarding and dashboard.
 */
export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-white/[0.04] flex items-center px-6 gap-4">
        <div className="h-5 w-32 skeleton rounded" />
        <div className="ml-auto h-8 w-24 skeleton rounded-lg" />
      </div>

      {/* Board grid skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-40 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
