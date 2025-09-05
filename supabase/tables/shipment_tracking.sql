CREATE TABLE shipment_tracking (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    updated_by UUID,
    is_customer_visible BOOLEAN DEFAULT true,
    notification_sent BOOLEAN DEFAULT false
);