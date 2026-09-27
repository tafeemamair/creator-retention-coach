"use client";

import { useState } from "react";
import { createClient, getSupabaseCredentials } from "@/lib/supabase/client";

interface LoginFormProps {
  nextUrl?: string;
}

export default function LoginForm({ nextUrl = "/app" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConfigured } = getSupabaseCredentials();

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);

      const supabase = createClient();
      if (!supabase || !isConfigured) {
        setError(
          "Supabase authentication is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in ui/.env.local and restart the server."
        );
        setLoadingGoogle(false);
        return;
      }

      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (authErr) {
        if (authErr.message === "Failed to fetch" || authErr.message.includes("fetch failed")) {
          setError(
            "Unable to reach the Supabase authentication server. Please verify network connectivity and that NEXT_PUBLIC_SUPABASE_URL is valid and reachable."
          );
        } else {
          setError(authErr.message);
        }
        setLoadingGoogle(false);
      }
    } catch (err) {
      console.error("Google sign in error:", err);
      setError("An unexpected error occurred during Google sign in.");
      setLoadingGoogle(false);
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoadingMagic(true);
      setError(null);

      const supabase = createClient();
      if (!supabase || !isConfigured) {
        setError(
          "Supabase authentication is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in ui/.env.local and restart the server."
        );
        setLoadingMagic(false);
        return;
      }

      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error: authErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo,
        },
      });

      if (authErr) {
        if (authErr.message === "Failed to fetch" || authErr.message.includes("fetch failed")) {
          setError(
            "Unable to reach the Supabase authentication server. Please verify network connectivity and that NEXT_PUBLIC_SUPABASE_URL is valid and reachable."
          );
        } else {
          setError(authErr.message);
        }
      } else {
        setMagicSent(true);
      }
    } catch (err) {
      console.error("Magic link sign in error:", err);
      setError("Failed to send magic link. Please try again.");
    } finally {
      setLoadingMagic(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-3">
          <span>Creator Workspace</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to Your Workspace</h1>
        <p className="text-sm text-slate-400 mt-2">
          Save analysis history, access your credits, and manage short-form scripts.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle || loadingMagic}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingGoogle ? (
          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <span className="relative px-4 text-xs uppercase tracking-wider text-slate-500 bg-slate-900">
          Or continue with email
        </span>
      </div>

      {/* Magic Link Form */}
      {magicSent ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm text-center">
          <div className="text-2xl mb-2">📬</div>
          <p className="font-semibold text-emerald-200">Magic link sent!</p>
          <p className="text-xs text-emerald-400/80 mt-1">
            Check your inbox at <span className="font-mono text-emerald-300">{email}</span> and click the link to sign in.
          </p>
        </div>
      ) : (
        <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
              required
              disabled={loadingMagic || loadingGoogle}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loadingMagic || loadingGoogle}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loadingMagic ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Send Magic Link</span>
            )}
          </button>
        </form>
      )}

      <p className="text-xs text-slate-500 text-center mt-8">
        By continuing, you agree to Creator Retention Coach&apos;s{" "}
        <a href="/terms" className="text-slate-400 hover:text-slate-300 underline">Terms</a> and{" "}
        <a href="/privacy" className="text-slate-400 hover:text-slate-300 underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
