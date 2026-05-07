import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ items: [] });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ items: [], error: 'YOUTUBE_API_KEY no configurada' }, { status: 500 });
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('q', q);
  url.searchParams.set('maxResults', '8');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ items: [], error: data?.error?.message }, { status: res.status });
  }

  return NextResponse.json(data);
}
