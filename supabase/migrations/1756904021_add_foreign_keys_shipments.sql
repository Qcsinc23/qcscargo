-- Migration: add_foreign_keys_shipments
-- Created at: 1756904021

-- Add foreign key constraints to enable proper joins
ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_destinations 
FOREIGN KEY (destination_id) 
REFERENCES destinations (id);;