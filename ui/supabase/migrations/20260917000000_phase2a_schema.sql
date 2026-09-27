-- ==============================================================================
-- CRC Phase 2A — Supabase PostgreSQL Schema & Security Policies
-- Migration: 20260917000000_phase2a_schema.sql
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Entitlements Table (Authoritative Account Credits & Free Quota)
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    free_analysis_used BOOLEAN NOT NULL DEFAULT FALSE,
    paid_credits INTEGER NOT NULL DEFAULT 0 CHECK (paid_credits >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payment Orders Table (Durable Razorpay Order & Payment Tracking)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    order_id TEXT PRIMARY KEY,
    payment_id TEXT UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    credits INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Analyses Table (Structured Script Retention Analyses)
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    platform TEXT NOT NULL DEFAULT 'YouTube Shorts',
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    analysis_result JSONB NOT NULL,
    predicted_timeline JSONB NOT NULL,
    script_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analyses_user_script_platform UNIQUE (user_id, script_hash, platform)
);

-- 6. Indexes for High-Performance Querying
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_script_platform ON public.analyses(user_id, script_hash, platform);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_claimed ON public.payment_orders(claimed_by_user_id);

-- 7. Hardened Trigger for New Auth Users (SECURITY DEFINER with strict search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Atomic Profile Creation
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    -- Atomic Default Entitlement (1 Free Analysis, 0 Paid Credits)
    INSERT INTO public.entitlements (user_id, free_analysis_used, paid_credits)
    VALUES (NEW.id, FALSE, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
        RAISE EXCEPTION 'User profile initialization failed. Transaction aborted.';
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Row Level Security (RLS) Configuration

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Entitlements Policies (Server-Only Mutations)
DROP POLICY IF EXISTS "entitlements_select_own" ON public.entitlements;
CREATE POLICY "entitlements_select_own"
    ON public.entitlements FOR SELECT
    USING (auth.uid() = user_id);

-- Analyses Policies (Server-Only Mutations to ensure verified credit consumption)
DROP POLICY IF EXISTS "analyses_select_own" ON public.analyses;
CREATE POLICY "analyses_select_own"
    ON public.analyses FOR SELECT
    USING (auth.uid() = user_id);

-- Payment Orders Policies (Read-Only for user who placed or claimed order)
DROP POLICY IF EXISTS "payment_orders_select_own" ON public.payment_orders;
CREATE POLICY "payment_orders_select_own"
    ON public.payment_orders FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = claimed_by_user_id);
