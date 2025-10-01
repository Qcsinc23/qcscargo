-- Create shipping_quotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
    id SERIAL PRIMARY KEY,
    customer_id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    destination_id INTEGER NOT NULL,
    weight_lbs DECIMAL(8,2) NOT NULL,
    length_inches DECIMAL(6,2),
    width_inches DECIMAL(6,2),
    height_inches DECIMAL(6,2),
    service_type TEXT DEFAULT 'standard',
    declared_value DECIMAL(10,2),
    base_shipping_cost DECIMAL(10,2) NOT NULL,
    consolidation_fee DECIMAL(8,2) DEFAULT 0,
    handling_fee DECIMAL(8,2) DEFAULT 0,
    insurance_cost DECIMAL(8,2) DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL,
    estimated_transit_days INTEGER,
    special_instructions TEXT,
    status TEXT DEFAULT 'pending',
    quote_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhance shipping_quotes table for automated email quotations
ALTER TABLE public.shipping_quotes
  ADD COLUMN IF NOT EXISTS quote_reference TEXT,
  ADD COLUMN IF NOT EXISTS quote_document_html TEXT,
  ADD COLUMN IF NOT EXISTS quote_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS follow_up_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_method TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_error TEXT,
  ADD COLUMN IF NOT EXISTS pdf_attachment_present BOOLEAN DEFAULT FALSE;

-- Create unique index for quote references
CREATE UNIQUE INDEX IF NOT EXISTS shipping_quotes_quote_reference_idx
  ON public.shipping_quotes (quote_reference)
  WHERE quote_reference IS NOT NULL;

-- Enable RLS
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own quotes"
  ON public.shipping_quotes
  FOR SELECT
  USING (
    auth.uid() = customer_id OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Service role has full access"
  ON public.shipping_quotes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can create quotes"
  ON public.shipping_quotes
  FOR INSERT
  WITH CHECK (true);
