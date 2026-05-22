/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Profile,
  INSTRUMENTS,
  AVATAR_COLORS,
  AVATAR_COLOR_LIST,
  AvatarColor,
  SERVICE_LABELS,
  ServiceType,
  MemberRole,
  ROLE_LABELS,
} from '@/types';
import { getInitials, clearActiveProfileId } from '@/lib/utils';
import AppShell from '@/components/AppShell';
import {
  Camera,
  Edit2,
  Check,
  X,
  LogOut,
  Download,
  Bell,
  BellOff,
  Trash2,
  ChevronRight,
  Upload,
  Loader2,
  Music2,
  Mic2,
} from 'lucide-react';

// ─── Service history item type ────────────────────────────────────────────────

interface ServiceHistoryItem {
  service_id: string;
  date: string;
  type: ServiceType;
  role: MemberRole;
}

// ─── Notification permission state ───────────────────────────────────────────

type NotifState = 'unknown' | 'granted' | 'denied' | 'default' | 'unsupported';

function getNotifState(): NotifState {
  if (typeof window === 'undefined') return 'unknown';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifState;
}

// ─── Avatar preview (initials or photo) ──────────────────────────────────────

function AvatarPreview({
  profile,
  previewUrl,
  size = 80,
}: {
  profile: Profile;
  previewUrl: string | null;
  size?: number;
}) {
  const src = previewUrl ?? profile.photo_url;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={profile.name}
        className='rounded-full object-cover'
        style={{ width: size, height: size }}
      />
    );
  }
  const colors = AVATAR_COLORS[profile.color];
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold ${colors.bg} ${colors.text}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {getInitials(profile.name)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useActiveProfile();
  const { installState, triggerInstall } = usePWAInstall();

  // ── Editable state ──
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [selectedColor, setSelectedColor] = useState<AvatarColor>('purple');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // ── Photo upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);    // galería
  const cameraInputRef = useRef<HTMLInputElement>(null);  // cámara
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  // ── Service history ──
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Notifications ──
  const [notifState, setNotifState] = useState<NotifState>('unknown');

  // ── Delete profile ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Init state from profile
  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNameValue(profile.name);
    setSelectedColor(profile.color);
    setSelectedInstrument(profile.instrument ?? '');
    setNotifState(getNotifState());
  }, [profile]);

  // Load service history
  const loadHistory = useCallback(async (profileId: string) => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('service_members')
      .select('service_id, role, service:services(date, type)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) {
      const items: ServiceHistoryItem[] = data
        .filter((m: any) => m.service)
        .map((m: any) => ({
          service_id: m.service_id,
          date: m.service.date,
          type: m.service.type,
          role: m.role,
        }))
        // Deduplicate by service_id (keep first role found)
        .filter(
          (item: ServiceHistoryItem, idx: number, arr: ServiceHistoryItem[]) =>
            arr.findIndex((x) => x.service_id === item.service_id) === idx,
        )
        .slice(0, 5);
      setServiceHistory(items);
    }
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.id) loadHistory(profile.id);
  }, [profile?.id, loadHistory]);

  // ── Save name ──
  async function saveName() {
    if (!profile || !nameValue.trim()) return;
    setSaving(true);
    const newInitials = getInitials(nameValue.trim());
    await supabase
      .from('profiles')
      .update({ name: nameValue.trim(), initials: newInitials })
      .eq('id', profile.id);
    setSaving(false);
    setEditingName(false);
    // Refresh
    window.location.reload();
  }

  // ── Save color ──
  async function saveColor(color: AvatarColor) {
    if (!profile) return;
    setSelectedColor(color);
    await supabase.from('profiles').update({ color }).eq('id', profile.id);
  }

  // ── Save instrument ──
  async function saveInstrument(instrument: string) {
    if (!profile) return;
    setSelectedInstrument(instrument);
    await supabase
      .from('profiles')
      .update({ instrument: instrument || null })
      .eq('id', profile.id);
  }

  // ── Photo upload ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingPhoto(true);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${profile.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      const photoUrl = urlData.publicUrl + `?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ photo_url: photoUrl })
        .eq('id', profile.id);
      setPreviewUrl(photoUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setPreviewUrl(null);
      alert(
        'Error al subir la foto. Verificá que el bucket "avatars" esté configurado en Supabase.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Remove photo ──
  async function removePhoto() {
    if (!profile) return;
    await supabase
      .from('profiles')
      .update({ photo_url: null })
      .eq('id', profile.id);
    setPreviewUrl(null);
    window.location.reload();
  }

  // ── Notifications ──
  async function requestNotifications() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifState(perm as NotifState);

    if (perm === 'granted' && profile) {
      // Re-subscribe push
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        });
        await fetch('/api/push', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: profile.id,
            subscription: sub.toJSON(),
          }),
        });
      } catch (err) {
        console.warn('Push re-subscribe error:', err);
      }
    }
  }

  // ── Logout ──
  function handleLogout() {
    clearActiveProfileId();
    router.replace('/');
  }

  // ── Delete profile ──
  async function handleDeleteProfile() {
    if (!profile || deleteInput !== 'eliminar') return;
    setDeleting(true);
    // Remove from service_members, push_subscriptions, then profile
    await supabase
      .from('service_members')
      .delete()
      .eq('profile_id', profile.id);
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', profile.id);
    await supabase.from('profiles').delete().eq('id', profile.id);
    clearActiveProfileId();
    router.replace('/');
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (profileLoading || !profile) {
    return (
      <AppShell>
        <div
          className='flex items-center justify-center h-full'
          style={{ background: '#F8F7FF' }}>
          <div
            className='w-6 h-6 border-2 rounded-full animate-spin'
            style={{
              borderColor: 'var(--purple-100)',
              borderTopColor: 'var(--purple-600)',
            }}
          />
        </div>
      </AppShell>
    );
  }

  const hasPhoto = !!(previewUrl ?? profile.photo_url);

  return (
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* ── HEADER ── */}
        <div style={{ background: 'var(--purple-900)' }}>
          <div className='px-5 pt-5 pb-6 lg:pt-5 flex flex-col items-center gap-3'>
            {/* Avatar */}
            <div className='relative'>
              <AvatarPreview
                profile={{ ...profile, color: selectedColor }}
                previewUrl={previewUrl}
                size={80}
              />
              {/* Camera button */}
              <button
                onClick={() => setShowPhotoMenu(true)}
                disabled={uploadingPhoto}
                className='absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md'
                style={{ background: 'var(--purple-600)' }}
                title='Cambiar foto'>
                {uploadingPhoto ? (
                  <Loader2 size={14} className='text-white animate-spin' />
                ) : (
                  <Camera size={14} className='text-white' />
                )}
              </button>
              {/* Input cámara (con capture) */}
              <input
                ref={cameraInputRef}
                type='file'
                accept='image/*'
                capture='user'
                className='hidden'
                onChange={handleFileChange}
              />
              {/* Input galería (sin capture) */}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleFileChange}
              />
            </div>

            {/* Name */}
            {editingName ? (
              <div className='flex items-center gap-2 w-full max-w-xs'>
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className='flex-1 text-center text-white font-semibold text-lg bg-transparent border-b outline-none pb-0.5'
                  style={{ borderColor: 'var(--purple-400)' }}
                  autoFocus
                />
                <button
                  onClick={saveName}
                  disabled={saving}
                  className='text-green-400 hover:text-green-300'>
                  {saving ? (
                    <Loader2 size={16} className='animate-spin' />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(profile.name);
                  }}
                  className='text-red-400 hover:text-red-300'>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className='flex items-center gap-2 group'>
                <span className='text-white font-semibold text-lg'>
                  {profile.name}
                </span>
                <Edit2
                  size={14}
                  style={{ color: 'var(--purple-300)' }}
                  className='group-hover:opacity-80'
                />
              </button>
            )}

            {selectedInstrument && (
              <p className='text-sm' style={{ color: 'var(--purple-300)' }}>
                {selectedInstrument}
              </p>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div
          className='flex-1 overflow-y-auto px-4 py-5 lg:px-6 space-y-5'
          style={{ background: '#F8F7FF' }}>
          {/* Photo options */}
          {hasPhoto && (
            <div className='bg-white rounded-2xl shadow-sm'>
              <button
                onClick={() => setShowPhotoMenu(true)}
                className='w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 rounded-t-2xl'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: 'var(--purple-50)' }}>
                  <Upload size={15} style={{ color: 'var(--purple-600)' }} />
                </div>
                <span className='text-sm font-medium text-gray-800'>
                  Cambiar foto
                </span>
                <ChevronRight size={16} className='text-gray-300 ml-auto' />
              </button>
              <button
                onClick={removePhoto}
                className='w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 rounded-b-2xl'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: '#FEE2E2' }}>
                  <X size={15} style={{ color: '#DC2626' }} />
                </div>
                <span className='text-sm font-medium text-red-600'>
                  Quitar foto
                </span>
              </button>
            </div>
          )}

          {/* Avatar color (shown only when no photo) */}
          {!hasPhoto && (
            <div className='bg-white rounded-2xl shadow-sm p-4'>
              <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
                Color del avatar
              </p>
              <div className='flex gap-3 flex-wrap'>
                {AVATAR_COLOR_LIST.map((color) => {
                  const { bg } = AVATAR_COLORS[color];
                  const isSelected = selectedColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => saveColor(color)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${bg} ${isSelected ? 'scale-110' : ''}`}
                      style={
                        isSelected
                          ? {
                              outline: '2px solid var(--purple-600)',
                              outlineOffset: '2px',
                            }
                          : undefined
                      }
                      title={color}>
                      {isSelected && (
                        <Check
                          size={16}
                          style={{ color: 'var(--purple-600)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instrument */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
              Instrumento principal
            </p>
            <div className='flex flex-wrap gap-2'>
              {INSTRUMENTS.map((inst) => {
                const isSelected = selectedInstrument === inst;
                return (
                  <button
                    key={inst}
                    onClick={() => saveInstrument(isSelected ? '' : inst)}
                    className='px-3 py-1.5 rounded-full text-xs font-medium transition-all'
                    style={
                      isSelected
                        ? { background: 'var(--purple-600)', color: '#fff' }
                        : {
                            background: 'var(--purple-50)',
                            color: 'var(--purple-600)',
                          }
                    }>
                    {inst}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service history */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
              Mis últimos servicios
            </p>
            {loadingHistory ? (
              <div className='flex justify-center py-4'>
                <div
                  className='w-5 h-5 border-2 rounded-full animate-spin'
                  style={{
                    borderColor: 'var(--purple-100)',
                    borderTopColor: 'var(--purple-600)',
                  }}
                />
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className='flex flex-col items-center py-4 gap-2'>
                <Music2 size={24} style={{ color: 'var(--purple-200)' }} />
                <p className='text-xs text-gray-400'>
                  Todavía no participaste en ningún servicio
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {serviceHistory.map((item) => {
                  const d = new Date(item.date + 'T12:00:00');
                  const dateStr = d.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <button
                      key={item.service_id}
                      onClick={() => router.push(`/service/${item.service_id}`)}
                      className='w-full flex items-center gap-3 py-2.5 px-1 rounded-xl hover:bg-gray-50 transition-colors text-left'>
                      <div
                        className='w-8 h-8 rounded-xl flex items-center justify-center shrink-0'
                        style={{ background: 'var(--purple-50)' }}>
                        {item.role === 'coro' ? (
                          <Mic2
                            size={14}
                            style={{ color: 'var(--purple-600)' }}
                          />
                        ) : (
                          <Music2
                            size={14}
                            style={{ color: 'var(--purple-600)' }}
                          />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-semibold text-gray-800 truncate'>
                          {SERVICE_LABELS[item.type]}
                        </p>
                        <p className='text-xs text-gray-400 capitalize'>
                          {dateStr}
                        </p>
                      </div>
                      <span
                        className='text-xs font-medium px-2 py-0.5 rounded-full shrink-0'
                        style={{
                          background: 'var(--purple-50)',
                          color: 'var(--purple-600)',
                        }}>
                        {ROLE_LABELS[item.role]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* App & notifications */}
          <div className='bg-white rounded-2xl shadow-sm'>
            {/* Install */}
            {(installState === 'ready' || installState === 'ios') && (
              <button
                onClick={triggerInstall}
                className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-t-2xl text-left'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: 'var(--purple-50)' }}>
                  <Download size={15} style={{ color: 'var(--purple-600)' }} />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-800'>
                    Instalar app
                  </p>
                  <p className='text-xs text-gray-400'>
                    Accedé desde tu pantalla de inicio
                  </p>
                </div>
                <ChevronRight size={16} className='text-gray-300' />
              </button>
            )}
            {installState === 'installed' && (
              <div className='flex items-center gap-3 px-4 py-3.5'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: '#D1FAE5' }}>
                  <Check size={15} style={{ color: '#065F46' }} />
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    App instalada
                  </p>
                  <p className='text-xs text-gray-400'>
                    Ya estás usando la versión instalada
                  </p>
                </div>
              </div>
            )}

            {/* Notifications */}
            {notifState === 'unsupported' ? null : notifState === 'granted' ? (
              <div className='flex items-center gap-3 px-4 py-3.5'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: '#D1FAE5' }}>
                  <Bell size={15} style={{ color: '#065F46' }} />
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    Notificaciones activas
                  </p>
                  <p className='text-xs text-gray-400'>
                    Recibirás avisos de nuevas listas
                  </p>
                </div>
              </div>
            ) : notifState === 'denied' ? (
              <div className='flex items-center gap-3 px-4 py-3.5'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: '#FEE2E2' }}>
                  <BellOff size={15} style={{ color: '#DC2626' }} />
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    Notificaciones bloqueadas
                  </p>
                  <p className='text-xs text-gray-400'>
                    Habilitálas desde la configuración de tu navegador
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={requestNotifications}
                className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left'>
                <div
                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                  style={{ background: 'var(--orange-50)' }}>
                  <Bell size={15} style={{ color: 'var(--orange-600)' }} />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-800'>
                    Permitir notificaciones
                  </p>
                  <p className='text-xs text-gray-400'>
                    Activá las notificaciones push
                  </p>
                </div>
                <ChevronRight size={16} className='text-gray-300' />
              </button>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className='w-full bg-white rounded-2xl shadow-sm flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left'>
            <div
              className='w-8 h-8 rounded-xl flex items-center justify-center'
              style={{ background: 'var(--purple-50)' }}>
              <LogOut size={15} style={{ color: 'var(--purple-600)' }} />
            </div>
            <span className='text-sm font-medium text-gray-800'>
              Cerrar sesión
            </span>
            <ChevronRight size={16} className='text-gray-300 ml-auto' />
          </button>

          {/* Delete profile */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className='w-full bg-white rounded-2xl shadow-sm flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 text-left'>
            <div
              className='w-8 h-8 rounded-xl flex items-center justify-center'
              style={{ background: '#FEE2E2' }}>
              <Trash2 size={15} style={{ color: '#DC2626' }} />
            </div>
            <span className='text-sm font-medium text-red-600'>
              Eliminar perfil
            </span>
          </button>

          <div className='h-4' />
        </div>
      </div>

      {/* ── PHOTO MENU ── */}
      {showPhotoMenu && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center'
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPhotoMenu(false); }}>
          <div className='bg-white rounded-t-3xl lg:rounded-3xl p-5 lg:max-w-xs lg:w-full mx-auto'>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center'>
              Foto de perfil
            </p>
            <div className='space-y-2'>
              <button
                onClick={() => { setShowPhotoMenu(false); setTimeout(() => cameraInputRef.current?.click(), 50); }}
                className='w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50'
                style={{ background: 'var(--purple-50)' }}>
                <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ background: 'var(--purple-600)' }}>
                  <Camera size={16} className='text-white' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-800'>Tomar foto</p>
                  <p className='text-xs text-gray-400'>Usar la cámara del dispositivo</p>
                </div>
              </button>
              <button
                onClick={() => { setShowPhotoMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                className='w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50'
                style={{ background: '#F8F7FF' }}>
                <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ background: 'var(--purple-50)' }}>
                  <Upload size={16} style={{ color: 'var(--purple-600)' }} />
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-800'>Elegir de la galería</p>
                  <p className='text-xs text-gray-400'>Seleccionar una foto existente</p>
                </div>
              </button>
              <button
                onClick={() => setShowPhotoMenu(false)}
                className='w-full py-3 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-50 mt-1'>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center'
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}>
          <div className='bg-white rounded-t-3xl lg:rounded-3xl p-6 lg:max-w-sm lg:w-full mx-auto slide-up'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-gray-900'>Eliminar perfil</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInput('');
                }}
                className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                <X size={15} className='text-gray-500' />
              </button>
            </div>
            <p className='text-sm text-gray-500 mb-1'>
              Esta acción es <strong>irreversible</strong>. Se eliminará tu
              perfil y toda tu historial.
            </p>
            <p className='text-sm text-gray-500 mb-4'>
              Escribí <strong>eliminar</strong> para confirmar:
            </p>
            <input
              type='text'
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='eliminar'
              className='w-full px-4 py-2.5 rounded-xl border text-sm mb-4 input-ring'
              style={{ borderColor: '#E5E7EB' }}
            />
            <button
              onClick={handleDeleteProfile}
              disabled={deleteInput !== 'eliminar' || deleting}
              className='w-full py-3 rounded-2xl text-sm font-semibold transition-all'
              style={
                deleteInput === 'eliminar' && !deleting
                  ? { background: '#DC2626', color: '#fff' }
                  : {
                      background: '#F3F4F6',
                      color: '#9CA3AF',
                      cursor: 'not-allowed',
                    }
              }>
              {deleting ? 'Eliminando...' : 'Sí, eliminar mi perfil'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
