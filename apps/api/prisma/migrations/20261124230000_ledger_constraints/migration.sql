-- RENT and PENALTY charges must be positive. DEPOSIT and ADJUSTMENT are
-- intentionally unconstrained so append-only reversing adjustments can be
-- negative.
ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "chk_ledger_amount_positive"
  CHECK ("type"::text NOT IN ('RENT', 'PENALTY') OR "amount" > 0);