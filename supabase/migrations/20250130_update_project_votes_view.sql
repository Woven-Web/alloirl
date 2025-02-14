-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- First drop the existing trigger and function
DROP TRIGGER IF EXISTS refresh_project_votes_trigger ON transactions;
DROP FUNCTION IF EXISTS refresh_project_votes();

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS project_votes;

-- Recreate the materialized view with the improved query
CREATE MATERIALIZED VIEW project_votes AS
SELECT 
    p.id as project_id,
    COALESCE(SUM(t.amount), 0) as total_votes,
    COUNT(DISTINCT t.user_id) as unique_voters,
    MAX(t.created_at) as last_updated
FROM projects p
LEFT JOIN transactions t ON p.id = t.project_id
GROUP BY p.id;

-- Create a unique index for faster refreshing
CREATE UNIQUE INDEX project_votes_project_id_idx ON project_votes (project_id);

-- Recreate function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_votes()
RETURNS TRIGGER 
SECURITY DEFINER  -- This makes the function run as the owner (postgres)
SET search_path = public  -- Restrict search_path for security
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_votes;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to refresh the view when transactions change
CREATE TRIGGER refresh_project_votes_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_project_votes();

-- Grant minimum required permissions
ALTER MATERIALIZED VIEW project_votes OWNER TO postgres;
GRANT SELECT ON project_votes TO authenticated;  -- Regular users can only read
GRANT SELECT ON project_votes TO anon;          -- Anonymous users can only read
GRANT ALL ON project_votes TO postgres;         -- Postgres needs full access for maintenance
GRANT ALL ON project_votes TO service_role;     -- Service role needs full access for the trigger
