CREATE TABLE document_templates (
    id SERIAL PRIMARY KEY,
    template_type TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    required_fields JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);