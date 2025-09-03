CREATE TABLE contact_inquiries (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    inquiry_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'new',
    assigned_to TEXT,
    responded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);