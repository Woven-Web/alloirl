import { createClient } from '@supabase/supabase-js';

export const createAdminClient = async () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ADMIN_KEY!,
    {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
};