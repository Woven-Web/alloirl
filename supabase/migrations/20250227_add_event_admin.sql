-- Add admin field to event_participants table
ALTER TABLE event_participants ADD COLUMN admin BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies for events table
DROP POLICY IF EXISTS "Event admins can update events" ON events;
CREATE POLICY "Event admins can update events" 
ON events
FOR UPDATE 
TO authenticated
USING (
  -- Allow superadmins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
  OR
  -- Allow event admins
  EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_participants.event_id = id
    AND event_participants.user_id = auth.uid()
    AND event_participants.admin = true
  )
);

-- Update RLS policies for event_participants table
DROP POLICY IF EXISTS "Event admins can update event_participants" ON event_participants;
CREATE POLICY "Event admins can update event_participants" 
ON event_participants
FOR UPDATE 
TO authenticated
USING (
  -- Allow superadmins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
  OR
  -- Allow event admins to update any participant in their event
  EXISTS (
    SELECT 1 FROM event_participants AS admin_participant
    WHERE admin_participant.event_id = event_participants.event_id
    AND admin_participant.user_id = auth.uid()
    AND admin_participant.admin = true
  )
);

-- Update RLS policies for event_allowlist table
DROP POLICY IF EXISTS "Event admins can update event_allowlist" ON event_allowlist;
CREATE POLICY "Event admins can update event_allowlist" 
ON event_allowlist
FOR ALL
TO authenticated
USING (
  -- Allow superadmins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
  OR
  -- Allow event admins
  EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_participants.event_id = event_id
    AND event_participants.user_id = auth.uid()
    AND event_participants.admin = true
  )
);

-- Update RLS policies for projects table
DROP POLICY IF EXISTS "Event admins can update projects" ON projects;
CREATE POLICY "Event admins can update projects" 
ON projects
FOR ALL
TO authenticated
USING (
  -- Allow superadmins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
  OR
  -- Allow event admins
  EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_participants.event_id = event_id
    AND event_participants.user_id = auth.uid()
    AND event_participants.admin = true
  )
); 