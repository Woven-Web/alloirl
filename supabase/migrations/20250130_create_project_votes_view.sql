-- Create the materialized view
CREATE MATERIALIZED VIEW project_votes AS
SELECT 
    project_id,
    SUM(amount) as total_votes,
    COUNT(DISTINCT user_id) as unique_voters,
    MAX(created_at) as last_updated
FROM transactions
WHERE project_id IS NOT NULL
GROUP BY project_id;

-- Create a unique index for faster refreshing
CREATE UNIQUE INDEX project_votes_project_id_idx ON project_votes (project_id);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_votes()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_votes;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh the view when transactions change
CREATE TRIGGER refresh_project_votes_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_project_votes();

-- Grant access to the authenticated users
GRANT SELECT ON project_votes TO authenticated;
