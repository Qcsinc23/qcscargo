CREATE TABLE communications (
    id SERIAL PRIMARY KEY,
    thread_id TEXT,
    sender_id UUID NOT NULL,
    recipient_id UUID,
    shipment_id INTEGER,
    message_type TEXT NOT NULL DEFAULT 'message',
    subject TEXT,
    content TEXT NOT NULL,
    attachments JSONB,
    read_status BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    reply_to_id INTEGER,
    is_internal BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);