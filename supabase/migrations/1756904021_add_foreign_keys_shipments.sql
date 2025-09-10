-- Migration: add_foreign_keys_shipments
-- Created at: 1756904021

-- Add foreign key constraints to enable proper joins
DO $$ 
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_shipments_destinations' 
        AND table_name = 'shipments'
    ) THEN
        ALTER TABLE shipments 
        ADD CONSTRAINT fk_shipments_destinations 
        FOREIGN KEY (destination_id) 
        REFERENCES destinations (id);
    END IF;
END $$;
