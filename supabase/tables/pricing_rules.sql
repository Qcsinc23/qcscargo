CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    destination_id INTEGER NOT NULL,
    service_type TEXT NOT NULL DEFAULT 'standard',
    weight_min DECIMAL(8,2) NOT NULL,
    weight_max DECIMAL(8,2),
    rate_per_lb DECIMAL(10,2) NOT NULL,
    express_surcharge_percent DECIMAL(5,2) DEFAULT 25.00,
    effective_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);