'use client';
import type { SongCategory } from '@/types';

const OPTIONS: { value: SongCategory; label: string; hint: string }[] = [
  { value: 'alabanza', label: 'Alabanza', hint: 'Canción rápida' },
  { value: 'adoracion', label: 'Adoración', hint: 'Canción lenta' },
];

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: SongCategory | null;
  onChange: (category: SongCategory) => void;
}) {
  return (
    <div className='grid grid-cols-2 gap-2'>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type='button'
            onClick={() => onChange(opt.value)}
            className='px-3 py-2.5 rounded-xl border text-left'
            style={
              active
                ? {
                    borderColor: 'var(--accent)',
                    background: 'rgba(91, 124, 250, 0.14)',
                  }
                : {
                    borderColor: 'var(--border)',
                    background: 'var(--surface-soft)',
                  }
            }>
            <span
              className='block text-sm font-semibold uppercase'
              style={{
                color: active ? 'var(--accent)' : 'var(--text-primary)',
              }}>
              {opt.label}
            </span>
            <span
              className='block text-xs mt-0.5'
              style={{ color: 'var(--text-secondary)' }}>
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
