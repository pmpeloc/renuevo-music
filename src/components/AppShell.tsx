'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import Avatar from './Avatar';
import Image from 'next/image';
import { Home, LogOut, Music2 } from 'lucide-react';
import { clearActiveProfileId } from '@/lib/utils';
import PWAInstallButton from './PWAInstallButton';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useActiveProfile();

  function handleLogout() {
    clearActiveProfileId();
    router.replace('/');
  }

  const isHome = pathname === '/home';

  return (
    <div className='flex h-full'>
      {/* ── SIDEBAR — solo en desktop (lg+) ── */}
      <aside
        className='hidden lg:flex flex-col w-56 xl:w-60 shrink-0'
        style={{ background: 'var(--purple-900)' }}>

        {/* Logo */}
        <div
          className='flex items-center gap-3 px-5 py-5'
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className='w-10 h-10 rounded-2xl overflow-hidden shrink-0'>
            <Image
              src='/renuevo-music-2.png'
              alt='Renuevo Music'
              width={40}
              height={40}
              className='w-full h-full object-cover'
              priority
            />
          </div>
          <div>
            <p className='text-sm font-semibold text-white leading-tight'>
              Renuevo
            </p>
            <p className='text-xs' style={{ color: 'var(--purple-200)' }}>
              Music
            </p>
          </div>
        </div>

        {/* Navegación */}
        <nav className='flex-1 p-3 space-y-1'>
          <button
            onClick={() => router.push('/home')}
            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left'
            style={
              isHome
                ? { background: 'rgba(255,255,255,0.13)', color: '#fff' }
                : { color: 'rgba(255,255,255,0.55)' }
            }>
            <Home size={17} aria-hidden />
            Inicio
          </button>
          <div
            className='px-3 py-2.5 flex items-center gap-3 rounded-xl text-sm opacity-40'
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            <Music2 size={17} aria-hidden />
            Canciones
          </div>
        </nav>

        {/* Footer: perfil + logout */}
        <div
          className='p-4 space-y-3'
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {profile && (
            <div className='flex items-center gap-3 min-w-0'>
              <Avatar profile={profile} size='sm' />
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-semibold text-white truncate'>
                  {profile.name}
                </p>
                <p
                  className='text-[10px] truncate'
                  style={{ color: 'var(--purple-200)' }}>
                  Equipo Renuevo
                </p>
              </div>
            </div>
          )}
          <div className='flex items-center gap-2 flex-wrap'>
            <PWAInstallButton />
            <button
              onClick={handleLogout}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors'
              style={{
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.07)',
              }}
              title='Cerrar sesión'>
              <LogOut size={13} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        {children}
      </div>
    </div>
  );
}
