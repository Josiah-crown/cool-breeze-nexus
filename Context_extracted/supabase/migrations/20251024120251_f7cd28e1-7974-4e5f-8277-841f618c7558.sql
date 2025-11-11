-- Make machine_id nullable so keys can be generated before assignment
ALTER TABLE public.api_keys 
ALTER COLUMN machine_id DROP NOT NULL;

-- Add index for unassigned keys
CREATE INDEX idx_api_keys_unassigned ON public.api_keys(is_active) WHERE machine_id IS NULL;