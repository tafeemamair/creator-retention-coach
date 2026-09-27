-- ==============================================================================
-- CRC Phase 1 — V2 Multilingual Foundation Schema Migration
-- Migration: 20260924000000_v2_multilingual.sql
-- ==============================================================================

-- 1. Add detected_language and target_language columns to public.analyses
ALTER TABLE public.analyses
    ADD COLUMN IF NOT EXISTS detected_language TEXT NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS target_language TEXT NOT NULL DEFAULT 'en';

-- 2. Create index on detected_language for analytics and language-filtered querying
CREATE INDEX IF NOT EXISTS idx_analyses_detected_language ON public.analyses(detected_language);
CREATE INDEX IF NOT EXISTS idx_analyses_target_language ON public.analyses(target_language);
