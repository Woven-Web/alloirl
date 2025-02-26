-- First, drop the existing unique constraint on email
DO $$ 
BEGIN
  -- Check if the constraint exists before trying to drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_allowlist_email_key' 
    AND table_name = 'event_allowlist'
  ) THEN
    ALTER TABLE event_allowlist DROP CONSTRAINT event_allowlist_email_key;
  END IF;
END $$;

-- Then add a new unique constraint on the combination of email and event_id
ALTER TABLE event_allowlist 
ADD CONSTRAINT event_allowlist_email_event_id_key 
UNIQUE (email, event_id);

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_event_allowlist_email_lower 
ON event_allowlist (LOWER(email)); 