CREATE TABLE IF NOT EXISTS public.facilities (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'QCS Cargo - Kearny',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT 'Kearny',
  state TEXT NOT NULL DEFAULT 'NJ',
  postal_code TEXT NOT NULL DEFAULT '07032',
  country TEXT NOT NULL DEFAULT 'United States',
  is_default BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.facilities (code, address_line1, address_line2)
VALUES ('E12', '35 Obrien St', 'E12')
ON CONFLICT (code) DO NOTHING;
