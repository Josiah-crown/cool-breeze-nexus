-- Partner storefront checkout: capture payer/site details before Paystack (not card data).

ALTER TABLE public.billing_orders
  ADD COLUMN IF NOT EXISTS checkout_snapshot JSONB;

COMMENT ON COLUMN public.billing_orders.checkout_snapshot IS
  'Customer + site details from partner checkout form. Applied to profiles when payment succeeds.';

CREATE INDEX IF NOT EXISTS idx_billing_orders_snapshot_email
  ON public.billing_orders ((lower(trim(checkout_snapshot->>'email'))))
  WHERE checkout_snapshot IS NOT NULL;
