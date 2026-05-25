-- Billing: orders + payments (v1)
-- Supports Paystack initialization + webhook confirmation.

DO $$ BEGIN
  CREATE TYPE public.billing_order_status AS ENUM ('created', 'pending_payment', 'paid', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_payment_provider AS ENUM ('paystack');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_payment_status AS ENUM ('initialized', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status public.billing_order_status NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_orders_user_id ON public.billing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON public.billing_orders(status);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.billing_orders(id) ON DELETE CASCADE,
  provider public.billing_payment_provider NOT NULL,
  provider_reference TEXT NOT NULL,
  status public.billing_payment_status NOT NULL DEFAULT 'initialized',
  authorization_url TEXT,
  provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_order_id ON public.billing_payments(order_id);

-- RLS
ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "billing_orders_select_own"
  ON public.billing_orders
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "billing_payments_select_own"
  ON public.billing_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.billing_orders o
      WHERE o.id = billing_payments.order_id
        AND o.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Updated_at triggers (reuse existing pattern if present; define minimal safe one here)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_orders_touch ON public.billing_orders;
CREATE TRIGGER trg_billing_orders_touch
  BEFORE UPDATE ON public.billing_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_billing_payments_touch ON public.billing_payments;
CREATE TRIGGER trg_billing_payments_touch
  BEFORE UPDATE ON public.billing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

