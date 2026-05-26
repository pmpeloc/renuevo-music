import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  purple: { bg: '#EEEDFE', text: '#26215C' },
  teal:   { bg: '#E1F5EE', text: '#085041' },
  coral:  { bg: '#FAECE7', text: '#4A1B0C' },
  blue:   { bg: '#E6F1FB', text: '#042C53' },
  pink:   { bg: '#FBEAF0', text: '#4B1528' },
  amber:  { bg: '#FAEEDA', text: '#412402' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const initials = (searchParams.get('initials') ?? '?').slice(0, 2).toUpperCase();
  const colorKey = searchParams.get('color') ?? 'purple';
  const { bg, text } = COLOR_MAP[colorKey] ?? COLOR_MAP.purple;

  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          borderRadius: 96,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 80,
          fontWeight: 600,
          color: text,
        }}
      >
        {initials}
      </div>
    ),
    { width: 192, height: 192 }
  );
}
