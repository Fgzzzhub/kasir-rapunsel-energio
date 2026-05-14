-- Migration: Shift Recaps & End of Day Feature
-- Creates the shift_recaps table and a helper RPC to calculate expected cash.

CREATE TABLE IF NOT EXISTS public.shift_recaps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expected_cash numeric NOT NULL,
  actual_cash numeric NOT NULL,
  variance numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);



-- RPC for Expected Cash Calculation
-- Note: Adjust the timezone if necessary, defaults to 'Asia/Jakarta' for Indonesian apps.
CREATE OR REPLACE FUNCTION get_expected_cash(p_business_id uuid, p_date date)
RETURNS numeric AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total
  FROM public.transactions
  WHERE business_id = p_business_id
    AND payment_method = 'cash'
    AND status = 'completed'
    AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = p_date;
    
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
