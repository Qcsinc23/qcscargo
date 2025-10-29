CREATE TYPE public.package_status AS ENUM (
  'received_at_warehouse',
  'pending_pickup',
  'picked_up',
  'forwarded',
  'disposed'
);
