CREATE TABLE public.received_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox_id INT NOT NULL REFERENCES public.virtual_mailboxes(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  carrier TEXT,
  status public.package_status NOT NULL DEFAULT 'received_at_warehouse',
  weight NUMERIC(10, 2),
  dimensions JSONB,
  package_photo_url TEXT,
  notes TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (tracking_number)
);

ALTER TABLE public.received_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY received_packages_admin_all
  ON public.received_packages
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY received_packages_user_select
  ON public.received_packages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX received_packages_user_id_idx
  ON public.received_packages (user_id);

CREATE INDEX received_packages_mailbox_id_idx
  ON public.received_packages (mailbox_id);
