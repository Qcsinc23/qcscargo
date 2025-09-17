CREATE SEQUENCE IF NOT EXISTS public.mailbox_seq START 100001;

CREATE OR REPLACE FUNCTION public.generate_mailbox_number()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'QCS' || nextval('public.mailbox_seq')::TEXT;
$$;
