import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side: use internal URL (direct to Supabase, works on Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const createServerSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
};

import { createClient } from "@supabase/supabase-js";
export const supabaseAdmin = () =>
  createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
