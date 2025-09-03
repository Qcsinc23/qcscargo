CREATE TABLE shipment_items (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    weight_lbs DECIMAL(8,2) NOT NULL,
    length_inches DECIMAL(6,2),
    width_inches DECIMAL(6,2),
    height_inches DECIMAL(6,2),
    declared_value DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    category TEXT,
    hs_code TEXT,
    origin_country TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);