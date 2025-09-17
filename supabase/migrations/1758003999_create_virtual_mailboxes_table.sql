CREATE TABLE IF NOT EXISTS public.virtual_mailboxes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id INT NOT NULL REFERENCES public.facilities(id),
  mailbox_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
