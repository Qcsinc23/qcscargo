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

CREATE UNIQUE INDEX IF NOT EXISTS shipping_quotes_quote_reference_idx
  ON public.shipping_quotes (quote_reference)
  WHERE quote_reference IS NOT NULL;
