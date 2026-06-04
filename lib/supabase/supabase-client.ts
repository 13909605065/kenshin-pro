import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Custom fetch: in browser, proxy Supabase requests through /api/supabase
// so they work from China (requests go through Vercel's server, not direct to supabase.co)
const browserFetch = (url: RequestInfo | URL, init?: RequestInit) => {
  if (typeof window !== "undefined" && typeof url === "string" && url.includes("supabase.co")) {
    url = url.replace(SUPABASE_URL, "/api/supabase");
  }
  return fetch(url, init);
};

export const createClient = () =>
  createBrowserClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: browserFetch },
  });
