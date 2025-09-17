DROP VIEW IF EXISTS public.virtual_mailbox_details;

CREATE VIEW public.virtual_mailbox_details AS
SELECT
  vm.id,
  vm.user_id,
  vm.mailbox_number,
  vm.created_at,
  vm.facility_id,
  f.code AS facility_code,
  f.address_line1,
  f.address_line2,
  f.city,
  f.state,
  f.postal_code,
  f.country,
  p.full_name,
  p.email
FROM public.virtual_mailboxes vm
JOIN public.facilities f ON f.id = vm.facility_id
LEFT JOIN public.profiles p ON p.id = vm.user_id;
