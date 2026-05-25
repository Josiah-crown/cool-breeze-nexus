-- Guest Paystack checkout: order may exist before auth user (provisioned on payment success).

ALTER TABLE public.billing_orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.billing_orders
  ADD COLUMN IF NOT EXISTS checkout_email TEXT;

-- Every order must be tied to a user and/or the email used at Paystack init.
ALTER TABLE public.billing_orders
  DROP CONSTRAINT IF EXISTS billing_orders_user_or_email_chk;

ALTER TABLE public.billing_orders
  ADD CONSTRAINT billing_orders_user_or_email_chk
  CHECK (
    user_id IS NOT NULL
    OR (checkout_email IS NOT NULL AND length(trim(checkout_email)) > 0)
  );

CREATE INDEX IF NOT EXISTS idx_billing_orders_checkout_email
  ON public.billing_orders (lower(trim(checkout_email)))
  WHERE checkout_email IS NOT NULL;

COMMENT ON COLUMN public.billing_orders.checkout_email IS
  'Payer email for guest checkout; user_id is set when paystack-webhook provisions the Cmonitor account.';
