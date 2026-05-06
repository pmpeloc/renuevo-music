import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/push — Enviar push a todos los suscriptores (excepto el emisor)
export async function POST(req: NextRequest) {
  try {
    const { title, body, url, excludeProfileId } = await req.json();
    const supabase = getSupabaseAdmin();

    let query = supabase.from('push_subscriptions').select('*');
    if (excludeProfileId) {
      query = query.neq('profile_id', excludeProfileId);
    }
    const { data: subs } = await query;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    const toDelete: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err: unknown) {
          // Si el endpoint expiró, eliminarlo
          if (err && typeof err === 'object' && 'statusCode' in err) {
            const statusCode = (err as { statusCode: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              toDelete.push(sub.endpoint);
            }
          }
        }
      })
    );

    // Limpiar suscripciones expiradas
    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toDelete);
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('Push error:', err);
    return NextResponse.json({ error: 'Error enviando push' }, { status: 500 });
  }
}

// POST /api/push/subscribe — Registrar suscripción
export async function PUT(req: NextRequest) {
  try {
    const { profileId, subscription } = await req.json();
    const supabase = getSupabaseAdmin();

    await supabase.from('push_subscriptions').upsert(
      {
        profile_id: profileId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Error al suscribir' }, { status: 500 });
  }
}
