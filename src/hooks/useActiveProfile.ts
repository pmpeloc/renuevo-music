'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { getActiveProfileId } from '@/lib/utils';

export function useActiveProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) {
      router.replace('/');
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          router.replace('/');
        } else {
          setProfile(data);
        }
        setLoading(false);
      });
  }, [router]);

  return { profile, loading };
}
