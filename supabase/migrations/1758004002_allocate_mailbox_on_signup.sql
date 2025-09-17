CREATE OR REPLACE FUNCTION public.allocate_mailbox_on_signup()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_allocate_mailbox_on_signup ON auth.users;

CREATE TRIGGER trg_allocate_mailbox_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.allocate_mailbox_on_signup();
