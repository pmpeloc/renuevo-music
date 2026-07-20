import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'mark' | 'lockup';
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  variant = 'lockup',
  size = 48,
  className = '',
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <Image
        src='/brand/renuevo-mark.svg'
        alt='Renuevo Music'
        width={size}
        height={size}
        className='brand-lockup__mark object-contain'
        priority={priority}
      />
      {variant === 'lockup' && (
        <span className='brand-lockup__name' aria-hidden='true'>
          <span>Renuevo</span>
          <span>Music</span>
        </span>
      )}
    </span>
  );
}
