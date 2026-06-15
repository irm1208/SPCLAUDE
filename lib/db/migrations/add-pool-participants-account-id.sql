-- Add account_id column to pool_participants for explicit account FK linkage
-- accountId = telegramUsername (the PK for accounts in this codebase)
ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS account_id TEXT;
