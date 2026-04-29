-- Migration: add location and beacon fields to SeizureLog
ALTER TABLE "SeizureLog"
  ADD COLUMN IF NOT EXISTS "latitude"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "beaconFiredAt" TIMESTAMP(3);
