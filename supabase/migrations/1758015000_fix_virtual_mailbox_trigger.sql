-- Ensure mailbox allocation trigger runs with elevated privileges and can bypass RLS
CREATE OR REPLACE FUNCTION public.allocate_mailbox_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  default_facility_id INT;
  new_mailbox TEXT;
BEGIN
  SELECT id INTO default_facility_id
  FROM public.facilities
  WHERE is_default = TRUE
  ORDER BY id
  LIMIT 1;

  IF default_facility_id IS NULL THEN
    RAISE EXCEPTION 'No default facility configured.';
  END IF;

  new_mailbox := public.generate_mailbox_number();

  INSERT INTO public.virtual_mailboxes (user_id, facility_id, mailbox_number)
  VALUES (NEW.id, default_facility_id, new_mailbox);

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.allocate_mailbox_on_signup() OWNER TO postgres;

-- Allow backend-triggered inserts while keeping client writes restricted
DROP POLICY IF EXISTS vm_internal_insert ON public.virtual_mailboxes;
CREATE POLICY vm_internal_insert
ON public.virtual_mailboxes
FOR INSERT
WITH CHECK (auth.jwt() IS NULL OR auth.role() = 'service_role');
