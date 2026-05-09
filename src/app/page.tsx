'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, AVATAR_COLOR_LIST, AvatarColor } from '@/types';
import {
  getInitials,
  setActiveProfileId,
  getActiveProfileId,
} from '@/lib/utils';
import Avatar from '@/components/Avatar';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';

export default function ProfileSelectionPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<AvatarColor>('teal');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    if (id) router.replace('/home');
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    setProfiles(data ?? []);
    setLoading(false);
  }

  function selectProfile(profile: Profile) {
    setActiveProfileId(profile.id);
    router.push('/home');
  }

  async function createProfile() {
    if (!newName.trim()) return;
    setCreating(true);
    const initials = getInitials(newName.trim());
    const { data, error } = await supabase
      .from('profiles')
      .insert({ name: newName.trim(), initials, color: newColor })
      .select()
      .single();
    if (!error && data) {
      setProfiles((prev) => [...prev, data]);
      setShowCreate(false);
      setNewName('');
      setNewColor('teal');
    }
    setCreating(false);
  }

  const previewProfile = newName.trim()
    ? {
        name: newName.trim(),
        initials: getInitials(newName.trim()),
        color: newColor,
        photo_url: null,
      }
    : null;

  const COLOR_HEX: Record<AvatarColor, string> = {
    purple: '#534AB7',
    teal: '#1D9E75',
    coral: '#D85A30',
    blue: '#378ADD',
    pink: '#D4537E',
    amber: '#BA7517',
  };

  return (
    <>
      <ServiceWorkerRegister />
      <div
        className='min-h-full flex flex-col'
        style={{ background: 'var(--purple-900)' }}>
        {/* Header */}
        <div className='pt-16 pb-8 px-6 text-center'>
          <div className='w-24 h-24 rounded-3xl mx-auto mb-4 overflow-hidden'>
            <Image
              src='/renuevo-music-2.png'
              alt='Renuevo Music'
              width={96}
              height={96}
              className='w-full h-full object-cover'
              priority
            />
          </div>
          <h1 className='text-2xl font-semibold text-white mb-1'>
            Renuevo Music
          </h1>
          <p style={{ color: 'var(--purple-200)' }} className='text-sm'>
            Selecciona tu perfil para continuar
          </p>
        </div>

        {/* Profiles list */}
        <div className='flex-1 bg-white rounded-t-3xl px-4 pt-6 pb-10'>
          {loading ? (
            <div className='flex justify-center py-12'>
              <div
                className='w-6 h-6 border-2 rounded-full animate-spin'
                style={{
                  borderColor: 'var(--purple-100)',
                  borderTopColor: 'var(--purple-600)',
                }}
              />
            </div>
          ) : (
            <div className='space-y-2 fade-in'>
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => selectProfile(profile)}
                  className='w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left'>
                  <Avatar profile={profile} size='lg' />
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-gray-900 text-base'>
                      {profile.name}
                    </p>
                    <p className='text-sm text-gray-400'>Toca para continuar</p>
                  </div>
                  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                    <path
                      d='M7 4l6 6-6 6'
                      stroke='#d1d5db'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
              ))}

              <button
                onClick={() => setShowCreate(true)}
                className='w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors text-left mt-2'>
                <div className='w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0'>
                  <Plus size={22} className='text-gray-400' />
                </div>
                <p className='font-medium text-gray-500'>Crear nuevo perfil</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear perfil */}
      {showCreate && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end'
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}>
          <div className='bg-white rounded-t-3xl p-6 slide-up'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-lg font-semibold'>Nuevo perfil</h2>
              <button
                onClick={() => setShowCreate(false)}
                className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                <X size={16} className='text-gray-500' />
              </button>
            </div>

            {/* Preview avatar */}
            <div className='flex justify-center mb-6'>
              {previewProfile ? (
                <Avatar profile={previewProfile} size='lg' />
              ) : (
                <div className='w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center'>
                  <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
                    <circle
                      cx='12'
                      cy='8'
                      r='4'
                      stroke='#9ca3af'
                      strokeWidth='1.5'
                    />
                    <path
                      d='M4 20c0-4 3.6-7 8-7s8 3 8 7'
                      stroke='#9ca3af'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Nombre */}
            <div className='mb-4'>
              <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block'>
                Nombre y apellido
              </label>
              <input
                type='text'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Ej: Juan García'
                className='w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100'
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createProfile()}
              />
            </div>

            {/* Color */}
            <div className='mb-6'>
              <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block'>
                Color del avatar
              </label>
              <div className='flex gap-3'>
                {AVATAR_COLOR_LIST.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-9 h-9 rounded-full transition-transform ${
                      newColor === color
                        ? 'scale-110 ring-2 ring-offset-2 ring-gray-400'
                        : ''
                    }`}
                    style={{ background: COLOR_HEX[color] }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={createProfile}
              disabled={!newName.trim() || creating}
              className='w-full py-4 rounded-2xl text-white font-semibold text-base transition-opacity disabled:opacity-40'
              style={{ background: 'var(--purple-600)' }}>
              {creating ? 'Creando...' : 'Crear perfil'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
