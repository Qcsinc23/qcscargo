CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID NOT NULL,
    related_shipment_id INTEGER,
    related_customer_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    task_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);