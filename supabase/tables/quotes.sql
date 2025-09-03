CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL,
    shipment_data JSONB NOT NULL,
    base_cost DECIMAL(10,2) NOT NULL,
    additional_services JSONB,
    total_cost DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL,
    approved_by UUID,
    valid_until TIMESTAMPTZ NOT NULL,
    converted_to_shipment BOOLEAN DEFAULT false,
    shipment_id INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);