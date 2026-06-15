-- Add is_public column to pool_participants for public/anonymous contributor toggle
ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
