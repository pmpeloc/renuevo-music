'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import Avatar from './Avatar';
import BrandLogo from './BrandLogo';
import { Home, Music2, BarChart3, User } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    label: 'Inicio',
    icon: Home,
    href: '/home',
    matchPrefixes: ['/home', '/service'],
  },
  {
    label: 'Canciones',
    icon: Music2,
    href: '/canciones',
    matchPrefixes: ['/canciones'],
  },
  {
    label: 'Métricas',
    icon: BarChart3,
    href: '/metricas',
    matchPrefixes: ['/metricas'],
  },
  { label: 'Perfil', icon: User, href: '/perfil', matchPrefixes: ['/perfil'] },
] as const;

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useActiveProfile();

  function isActive(prefixes: readonly string[]) {
    return prefixes.some((p) => pathname.startsWith(p));
  }

  return (
    <div className='app-shell flex h-full'>
      {/* ── SIDEBAR — desktop (lg+) ── */}
      <aside
        className='app-sidebar hidden lg:flex flex-col w-60 xl:w-64 shrink-0'>
        {/* Logo */}
        <div className='app-sidebar__logo px-5 py-6'>
          <BrandLogo size={52} priority />
        </div>

        {/* Nav items */}
        <nav className='flex-1 p-4 space-y-2'>
          {NAV_ITEMS.map(({ label, icon: Icon, href, matchPrefixes }) => {
            const active = isActive(matchPrefixes);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`app-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors text-left ${active ? 'app-nav-item--active' : ''}`}>
                <Icon size={20} aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer: perfil */}
        {profile && (
          <button
            onClick={() => router.push('/perfil')}
            className='app-profile flex items-center gap-3 px-4 py-4 transition-colors'>
            <Avatar profile={profile} size='sm' />
            <div className='flex-1 min-w-0 text-left'>
              <p className='text-sm font-semibold text-white truncate'>
                {profile.name}
              </p>
              <p
                className='text-xs truncate'
                style={{ color: 'var(--text-secondary)' }}>
                {profile.instrument ?? 'Ver perfil'}
              </p>
            </div>
          </button>
        )}
      </aside>

      {/* ── CONTENIDO + BOTTOM NAV (mobile) ── */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <header className='mobile-brand lg:hidden'>
          <BrandLogo size={36} />
        </header>

        {/* Content area */}
        <div className='flex-1 min-h-0 overflow-hidden'>{children}</div>

        {/* Bottom Nav — mobile only */}
        <nav
          className='bottom-nav lg:hidden flex items-center shrink-0'
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          {NAV_ITEMS.map(({ label, icon: Icon, href, matchPrefixes }) => {
            const active = isActive(matchPrefixes);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`bottom-nav__item flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${active ? 'bottom-nav__item--active' : ''}`}>
                <Icon size={21} aria-hidden />
                <span className='text-xs font-semibold'>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
