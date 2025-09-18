-- Backfill virtual mailboxes for existing authenticated users
-- Ensures every customer created before the allocation trigger existed has a mailbox

DO $$
DECLARE
  default_facility_id INT;
BEGIN
  SELECT id
  INTO default_facility_id
  FROM public.facilities
  WHERE is_default = TRUE
  ORDER BY id
  LIMIT 1;

  IF default_facility_id IS NULL THEN
    RAISE NOTICE 'No default facility configured. Skipping virtual mailbox backfill.';
    RETURN;
  END IF;

  INSERT INTO public.virtual_mailboxes (user_id, facility_id, mailbox_number)
  SELECT
    u.id,
    default_facility_id,
    public.generate_mailbox_number()
  FROM auth.users AS u
  LEFT JOIN public.virtual_mailboxes vm ON vm.user_id = u.id
  WHERE vm.id IS NULL
    AND u.aud = 'authenticated'
    AND u.email IS NOT NULL
  ORDER BY u.created_at;

  RAISE NOTICE 'Virtual mailbox backfill complete.';
END
$$;
