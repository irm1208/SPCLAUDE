DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'network'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'chain_namespace'
  ) THEN
    ALTER TABLE payment_transactions RENAME COLUMN network TO chain_namespace;
  END IF;
END $$;

ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_network_hash_key;
DROP INDEX IF EXISTS payment_tx_network_hash_unique;
UPDATE payment_transactions AS pt
SET chain_namespace = quote.network_name
FROM quotes AS quote
WHERE quote.id = pt.selected_quote_id
  AND pt.chain_namespace IS DISTINCT FROM quote.network_name;
CREATE UNIQUE INDEX IF NOT EXISTS payment_tx_chain_namespace_hash_unique
  ON payment_transactions(chain_namespace, hash);