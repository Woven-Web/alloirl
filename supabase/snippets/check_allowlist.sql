-- Check for exact email match
SELECT * FROM event_allowlist WHERE email = 'jborichevskiy@gmail.com';

-- Check for case-insensitive email match
SELECT * FROM event_allowlist WHERE LOWER(email) = LOWER('jborichevskiy@gmail.com');

-- Check all allowlist entries and their registration status
SELECT 
    email,
    event_id,
    has_registered,
    created_at
FROM event_allowlist 
ORDER BY created_at DESC;

-- Check if there are any leading/trailing spaces in emails
SELECT 
    email,
    LENGTH(email) as email_length,
    LENGTH(TRIM(email)) as trimmed_length,
    event_id,
    has_registered
FROM event_allowlist 
WHERE email LIKE '%jborichevskiy@gmail.com%'
   OR email LIKE '% %';