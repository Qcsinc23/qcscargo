ALTER TABLE public.virtual_mailboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vm_self_select ON public.virtual_mailboxes;
CREATE POLICY vm_self_select
ON public.virtual_mailboxes
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vm_admin_all ON public.virtual_mailboxes;
CREATE POLICY vm_admin_all
ON public.virtual_mailboxes
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
