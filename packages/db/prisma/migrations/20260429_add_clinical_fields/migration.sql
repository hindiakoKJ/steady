-- Migration: add clinical fields to SeizureLog
-- Adds: triggeredBy, isFalseAlarm, seizureType, triggers[], consciousnessLost,
--       injuryOccurred, postictalMinutes

ALTER TABLE "SeizureLog"
  ADD COLUMN IF NOT EXISTS "triggeredBy"       TEXT,
  ADD COLUMN IF NOT EXISTS "isFalseAlarm"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "seizureType"       TEXT,
  ADD COLUMN IF NOT EXISTS "triggers"          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "consciousnessLost" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "injuryOccurred"    BOOLEAN,
  ADD COLUMN IF NOT EXISTS "postictalMinutes"  INTEGER;
