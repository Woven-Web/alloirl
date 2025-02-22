-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS allocate_votes;

-- Recreate the function with reaction support and NULL protection
CREATE OR REPLACE FUNCTION allocate_votes(
    p_event_id UUID,
    p_project_id UUID,
    p_amount INTEGER,
    p_reaction TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_current_votes integer;
    v_available_votes integer;
    v_vote_difference integer;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Get current allocation
    SELECT COALESCE(votes, 0) INTO v_current_votes
    FROM project_allocations
    WHERE user_id = v_user_id 
    AND project_id = p_project_id 
    AND event_id = p_event_id;
    
    -- Calculate vote difference
    v_vote_difference := COALESCE(p_amount, 0) - COALESCE(v_current_votes, 0);
    
    -- Get available votes
    SELECT COALESCE(available_votes, 0) INTO v_available_votes
    FROM event_participants
    WHERE user_id = v_user_id AND event_id = p_event_id;
    
    -- Check if enough votes are available
    IF COALESCE(v_available_votes, 0) < v_vote_difference THEN
        RAISE EXCEPTION 'Not enough votes available';
    END IF;
    
    -- Insert or update allocation
    INSERT INTO project_allocations (
        event_id,
        project_id,
        user_id,
        votes,
        reaction
    )
    VALUES (
        p_event_id,
        p_project_id,
        v_user_id,
        COALESCE(p_amount, 0),
        p_reaction
    )
    ON CONFLICT (event_id, project_id, user_id)
    DO UPDATE SET 
        votes = COALESCE(EXCLUDED.votes, 0),
        reaction = EXCLUDED.reaction;
    
    -- Insert transaction record - always using vote_update
    INSERT INTO transactions (
        user_id,
        project_id,
        event_id,
        amount,
        type,
        previous_amount
    )
    VALUES (
        v_user_id,
        p_project_id,
        p_event_id,
        COALESCE(p_amount, 0),
        'vote_update'::public.transaction_type,
        COALESCE(v_current_votes, 0)
    );
    
    -- Update available votes with NULL protection
    UPDATE event_participants
    SET available_votes = GREATEST(0, COALESCE(available_votes, 0) - COALESCE(v_vote_difference, 0))
    WHERE user_id = v_user_id AND event_id = p_event_id;

    -- If no rows were updated, we need to create a participant record
    IF NOT FOUND THEN
        INSERT INTO event_participants (
            event_id,
            user_id,
            available_votes
        ) VALUES (
            p_event_id,
            v_user_id,
            GREATEST(0, COALESCE(10 - v_vote_difference, 0)) -- Assuming default of 10 votes
        );
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION allocate_votes TO authenticated; 