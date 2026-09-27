-- ==============================================================================
-- CRC Phase 3 — Script Revision Lineage & Manual Publication Outcomes
-- Migration: 20260926000000_phase3_lineage_outcomes.sql
-- ==============================================================================

-- 1. Add revision lineage parent pointer to public.analyses
ALTER TABLE public.analyses
    ADD COLUMN IF NOT EXISTS parent_analysis_id UUID NULL REFERENCES public.analyses(id) ON DELETE SET NULL;

-- 2. Add manual creator publication & performance outcome fields
ALTER TABLE public.analyses
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS published_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS actual_views INTEGER NULL,
    ADD COLUMN IF NOT EXISTS actual_retention_percent NUMERIC(5,2) NULL,
    ADD COLUMN IF NOT EXISTS actual_watch_time_seconds NUMERIC(6,2) NULL;

-- 3. Create index on parent_analysis_id for fast lineage traversal
CREATE INDEX IF NOT EXISTS idx_analyses_parent_analysis_id ON public.analyses(parent_analysis_id);
