import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder-project.supabase.co") &&
    supabaseAnonKey !== "placeholder-anon-key"
  );

  return {
    supabaseUrl: supabaseUrl || "",
    supabaseAnonKey: supabaseAnonKey || "",
    isConfigured,
  };
}

export function createClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies:
      typeof document === "undefined"
        ? {
            getAll() {
              return [];
            },
            setAll() {},
          }
        : undefined,
  });
}


