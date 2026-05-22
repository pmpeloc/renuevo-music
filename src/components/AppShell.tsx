'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import Avatar from './Avatar';
import Image from 'next/image';
import { Home, Music2, BarChart3, User } from 'lucide-react';
import { clearActiveProfileId } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Inicio',    icon: Home,       href: '/home',      matchPrefixes: ['/home', '/service'] },
  { label: 'Canciones', icon: Music2,      href: '/canciones', matchPrefixes: ['/canciones'] },
  { label: 'Métricas',  icon: BarChart3,   href: '/metricas',  matchPrefixes: ['/metricas'] },
  { label: 'Perfil',    icon: User,        href: '/perfil',    matchPrefixes: ['/perfil'] },
] as const;

export default function AppShell({ children }: AppShellProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { profile } = useActiveProfile();

  function isActive(prefixes: readonly string[]) {
    return prefixes.some((p) => pathname.startsWith(p));
  }

  return (
    <div className='flex h-full'>
      {/* ── SIDEBAR — desktop (lg+) ── */}
      <aside
        className='hidden lg:flex flex-col w-56 xl:w-60 shrink-0'
        style={{ background: 'var(--purple-900)' }}>

        {/* Logo */}
        <div
          className='flex items-center gap-3 px-5 py-5'
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className='w-10 h-10 rounded-2xl overflow-hidden shrink-0'>
            <Image src='/renuevo-music-2.png' alt='Renuevo Music' width={40} height={40}
              className='w-full h-full object-cover' priority />
          </div>
          <div>
            <p className='text-sm font-semibold text-white leading-tight'>Renuevo</p>
            <p className='text-xs' style={{ color: 'var(--purple-200)' }}>Music</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className='flex-1 p-3 space-y-0.5'>
          {NAV_ITEMS.map(({ label, icon: Icon, href, matchPrefixes }) => {
            const active = isActive(matchPrefixes);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left'
                style={
                  active
                    ? { background: 'rgba(255,255,255,0.13)', color: '#fff' }
                    : { color: 'rgba(255,255,255,0.55)' }
                }>
                <Icon size={17} aria-hidden />
                {label}
                {active && (
                  <div
                    className='ml-auto w-1.5 h-1.5 rounded-full'
                    style={{ background: 'var(--orange-600)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: perfil */}
        {profile && (
          <button
            onClick={() => router.push('/perfil')}
            className='flex items-center gap-3 px-4 py-4 transition-colors'
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            <Avatar profile={profile} size='sm' />
            <div className='flex-1 min-w-0 text-left'>
              <p className='text-xs font-semibold text-white truncate'>{profile.name}</p>
              <p className='text-[10px] truncate' style={{ color: 'var(--purple-200)' }}>
                {profile.instrument ?? 'Ver perfil'}
              </p>
            </div>
          </button>
        )}
      </aside>

      {/* ── CONTENIDO + BOTTOM NAV (mobile) ── */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        {/* Content area */}
        <div className='flex-1 min-h-0 overflow-hidden'>
          {children}
        </div>

        {/* Bottom Nav — mobile only */}
        <nav
          className='lg:hidden flex items-center shrink-0'
          style={{
            background: '#fff',
            borderTop: '1px solid #F3F4F6',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          {NAV_ITEMS.map(({ label, icon: Icon, href, matchPrefixes }) => {
            const active = isActive(matchPrefixes);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className='flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors'
                style={{ color: active ? 'var(--purple-600)' : '#9CA3AF' }}>
                <Icon size={21} aria-hidden />
                <span className='text-[10px] font-semibold'>{label}</span>
                {active && (
                  <div
                    className='absolute bottom-0 w-8 h-0.5 rounded-full'
                    style={{ background: 'var(--orange-600)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
