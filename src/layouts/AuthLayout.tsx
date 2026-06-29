import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BRAND } from '@/constants/brand'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-brand-navy">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-brand-orange/15 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:justify-center sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col items-center gap-3 text-center sm:mb-8">
          <div className="rounded-2xl bg-white px-5 py-4 shadow-2xl shadow-black/25 ring-1 ring-white/20 sm:px-8 sm:py-5">
            <Logo variant="auth" />
          </div>
          <p className="text-sm font-medium tracking-wide text-white/80">{BRAND.tagline}</p>
        </div>

        <div className="flex flex-1 flex-col justify-center sm:flex-none">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
