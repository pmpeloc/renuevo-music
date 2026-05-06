'use client';
import { MUSICAL_KEYS, MusicalKey } from '@/types';

interface KeySelectorProps {
  label: string;
  value: MusicalKey | null;
  onChange: (key: MusicalKey | null) => void;
  hint?: string;
}

const MAJOR_KEYS = MUSICAL_KEYS.slice(0, 12);
const MINOR_KEYS = MUSICAL_KEYS.slice(12);

export default function KeySelector({ label, value, onChange, hint }: KeySelectorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value as MusicalKey) || null)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-gray-900"
      >
        <option value="">— Sin especificar —</option>
        <optgroup label="Tonos mayores">
          {MAJOR_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </optgroup>
        <optgroup label="Tonos menores">
          {MINOR_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </optgroup>
      </select>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
