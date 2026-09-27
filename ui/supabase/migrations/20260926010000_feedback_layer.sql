-- ==============================================================================
-- CRC Final Feedback Layer — Analysis Feedback & Revision Utility
-- Migration: 20260926010000_feedback_layer.sql
-- ==============================================================================

-- 1. Create analysis_feedback table
CREATE TABLE IF NOT EXISTS public.analysis_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    usefulness TEXT NOT NULL CHECK (usefulness IN ('yes', 'somewhat', 'no')),
    useful_components TEXT[] NULL,
    comment TEXT NULL,
    revision_help TEXT NULL CHECK (revision_help IS NULL OR revision_help IN ('yes', 'somewhat', 'no')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analysis_feedback_user_analysis UNIQUE (user_id, analysis_id)
);

-- 2. Create index on analysis_id and user_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_user_id ON public.analysis_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_analysis_id ON public.analysis_feedback(analysis_id);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.analysis_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analysis_feedback_select_own" ON public.analysis_feedback;
CREATE POLICY "analysis_feedback_select_own"
    ON public.analysis_feedback FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "analysis_feedback_insert_own" ON public.analysis_feedback;
CREATE POLICY "analysis_feedback_insert_own"
    ON public.analysis_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "analysis_feedback_update_own" ON public.analysis_feedback;
CREATE POLICY "analysis_feedback_update_own"
    ON public.analysis_feedback FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
