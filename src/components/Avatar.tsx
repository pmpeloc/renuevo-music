'use client';
import Image from 'next/image';
import { Profile, AVATAR_COLORS } from '@/types';

interface AvatarProps {
  profile: Pick<Profile, 'name' | 'initials' | 'color' | 'photo_url'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export default function Avatar({ profile, size = 'md', className = '' }: AvatarProps) {
  const colors = AVATAR_COLORS[profile.color];
  const sizeClass = SIZE_MAP[size];

  if (profile.photo_url) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <Image
          src={profile.photo_url}
          alt={profile.name}
          width={56}
          height={56}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-medium ${colors.bg} ${colors.text} ${className}`}
    >
      {profile.initials}
    </div>
  );
}
