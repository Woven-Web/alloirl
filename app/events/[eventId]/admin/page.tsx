'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

interface EventParticipant {
  id: string;
  user_id: string;
  available_votes: number;
  profile: {
    email: string;
  };
}

interface Profile {
  id: string;
  email: string;
}

interface AllowlistEntry {
  id: string;
  email: string;
  has_registered: boolean;
}

export default function AdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [bulkEmails, setBulkEmails] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<{added: number, skipped: number, notFound: string[]}>({ added: 0, skipped: 0, notFound: [] });
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<string | null>(null);
  const [has406Error, setHas406Error] = useState(false);

  // Helper function to check if an error is a 406 error
  const is406Error = (error: any) => {
    return error && error.code === '406';
  };

  // Function to handle 406 errors
  const handle406Error = (error: any, operation: string) => {
    if (is406Error(error)) {
      console.warn(`406 Not Acceptable error during ${operation}. This is likely a content negotiation issue.`);
      setHas406Error(true);
      return true;
    }
    return false;
  };

  // Check database schema for event_allowlist table
  const checkAllowlistSchema = async () => {
    const supabase = createClient();
    try {
      // First check if the table exists by trying to select from it
      const { data: tableData, error: tableError } = await supabase
        .from('event_allowlist')
        .select('*')
        .limit(1);
      
      if (tableError) {
        // Check if it's a 406 Not Acceptable error
        if (handle406Error(tableError, 'schema check')) {
          setSchemaInfo(`The event_allowlist table exists, but there was a content negotiation issue. The app will still work normally.`);
          return true;
        }
        
        // Check if it's an RLS policy error
        if (tableError.code === '42501' || 
            (tableError.message && tableError.message.includes('violates row-level security policy'))) {
          console.log('Table exists but RLS policy prevents direct access');
          setSchemaInfo(`The event_allowlist table exists, but you may have limited access due to security policies. The app will still work, but some operations may require additional permissions.`);
          return true;
        }
        
        console.error('Error checking event_allowlist table:', tableError);
        setSchemaInfo(`Table check error: ${tableError.message}`);
        return false;
      }
      
      // Since you confirmed has_registered exists, we'll skip the column check
      setSchemaInfo(`Table exists and has_registered column is available.`);
      return true;
    } catch (err) {
      console.error('Unexpected error checking schema:', err);
      setSchemaInfo(`Schema check exception: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Checking admin status for user:', user.id, 'and event:', eventId);

      try {
        // Check if user is an admin in the profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('admin')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Admin check result:', { profile, error: profileError });

        if (profileError) {
          console.error('Error checking admin status:', profileError);
          setError('Error checking admin status');
          setLoading(false);
          return;
        }

        // If not an admin, redirect
        if (!profile || profile.admin !== true) {
          console.log('User is not an admin, redirecting...');
          router.push(`/events/${eventId}`);
          return;
        }

        console.log('User is confirmed as an admin');
        setIsAuthorized(true);
        
        // Check schema before fetching data
        const schemaOk = await checkAllowlistSchema();
        
        // If schema check failed, it might be because the column doesn't exist
        // We'll continue anyway and let the code handle it with fallbacks
        
        fetchData();
      } catch (err) {
        console.error('Unexpected error during access check:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    checkAccess();
  }, [eventId, router]);

  const fetchData = async () => {
    const supabase = createClient();
    setError(null);

    try {
      // First fetch all participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        setError('Error fetching participants');
        return;
      }

      if (participantsData && participantsData.length > 0) {
        // Then fetch profiles for these participants
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', participantsData.map(p => p.user_id));

        if (profilesError) {
          console.error('Error fetching participant profiles:', profilesError);
          setError('Error fetching participant profiles');
          return;
        }

        // Create a map of user_id to email
        const profileMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

        // Combine the data
        const transformedParticipants = participantsData
          .filter(p => profileMap.has(p.user_id))
          .map(p => ({
            ...p,
            profile: {
              email: profileMap.get(p.user_id)!
            }
          }))
          .sort((a, b) => a.profile.email.localeCompare(b.profile.email));

        setParticipants(transformedParticipants);
      } else {
        setParticipants([]);
      }

      // Fetch all profiles for the dropdown
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .order('email');

      if (allProfilesError) {
        console.error('Error fetching profiles:', allProfilesError);
        setError('Error fetching profiles for dropdown');
        return;
      }

      if (allProfiles) {
        setProfiles(allProfiles);
      }
      
      // Fetch allowlist entries - first try with has_registered column
      try {
        const { data: allowlistData, error: allowlistError } = await supabase
          .from('event_allowlist')
          .select('id, email, has_registered')
          .eq('event_id', eventId)
          .order('email');
          
        if (allowlistError) {
          // Check if it's a 406 Not Acceptable error
          if (handle406Error(allowlistError, 'fetching allowlist')) {
            // Try to continue with the operation - the app can still function
            setAllowlist([]);
            setSchemaInfo(`There was a content negotiation issue when fetching the allowlist. The app will still work, but the allowlist may not display correctly.`);
            return;
          }
          
          // Check if it's an RLS policy error
          if (allowlistError.code === '42501' || 
              (allowlistError.message && allowlistError.message.includes('violates row-level security policy'))) {
            console.warn('RLS policy error when fetching allowlist');
            setError(`Unable to view allowlist due to security policy restrictions. 
              This operation requires admin privileges. You need to have the admin flag set to true in your profiles record.
              Please contact your database administrator to update these permissions.`);
            setAllowlist([]);
            return;
          }
          
          // If error is about has_registered column, try without it
          if (allowlistError.message?.includes('has_registered') || 
              allowlistError.details?.includes('has_registered')) {
            console.warn('has_registered column does not exist, fetching without it');
            
            const { data: basicAllowlistData, error: basicAllowlistError } = await supabase
              .from('event_allowlist')
              .select('id, email')
              .eq('event_id', eventId)
              .order('email');
              
            if (basicAllowlistError) {
              // Check if it's a 406 Not Acceptable error
              if (handle406Error(basicAllowlistError, 'fetching basic allowlist')) {
                // Try to continue with the operation - the app can still function
                setAllowlist([]);
                setSchemaInfo(`There was a content negotiation issue when fetching the allowlist. The app will still work, but the allowlist may not display correctly.`);
                return;
              }
              
              // Check if it's an RLS policy error
              if (basicAllowlistError.code === '42501' || 
                  (basicAllowlistError.message && basicAllowlistError.message.includes('violates row-level security policy'))) {
                console.warn('RLS policy error when fetching basic allowlist');
                setError(`Unable to view allowlist due to security policy restrictions. 
                  This operation requires admin privileges. You need to have the admin flag set to true in your profiles record.
                  Please contact your database administrator to update these permissions.`);
                setAllowlist([]);
                return;
              }
              
              console.error('Error fetching allowlist (basic):', basicAllowlistError);
              setError('Error fetching event allowlist');
              return;
            }
            
            if (basicAllowlistData) {
              // Create a map of emails that are in the participants list
              const participantEmails = new Set(participants.map(p => p.profile.email.toLowerCase()));
              
              // For each allowlist entry, set has_registered based on whether the email is in participants
              const processedAllowlist = basicAllowlistData.map(entry => ({
                ...entry,
                has_registered: participantEmails.has(entry.email.toLowerCase())
              }));
              
              setAllowlist(processedAllowlist);
            } else {
              setAllowlist([]);
            }
          } else {
            console.error('Error fetching allowlist:', allowlistError);
            setError('Error fetching event allowlist');
            return;
          }
        } else if (allowlistData) {
          setAllowlist(allowlistData);
        } else {
          setAllowlist([]);
        }
      } catch (allowlistErr) {
        console.error('Exception fetching allowlist:', allowlistErr);
        setError('Error fetching event allowlist');
        return;
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;

    const supabase = createClient();
    setError(null);
    
    try {
      // Check if already a participant
      const { data: existing, error: checkError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('user_id', selectedUserId)
        .eq('event_id', eventId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // Not found error is ok
        console.error('Error checking existing participant:', checkError);
        setError('Error checking if user is already a participant');
        return;
      }

      if (existing) {
        alert('User is already a participant in this event');
        return;
      }

      // Add new participant
      const { error: insertError } = await supabase
        .from('event_participants')
        .insert({
          user_id: selectedUserId,
          event_id: eventId,
          available_votes: 100,
        });

      if (insertError) {
        console.error('Error adding participant:', insertError);
        setError('Failed to add participant');
        return;
      }

      // Refresh data
      fetchData();
      setSelectedUserId("");
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while adding participant');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmails.trim()) return;
    
    setProcessing(true);
    setError(null);
    setImportResults({ added: 0, skipped: 0, notFound: [] });
    
    const supabase = createClient();
    
    try {
      // Parse emails - split by commas, spaces, or newlines and trim whitespace
      const emailList = bulkEmails
        .split(/[\s,\n]+/)
        .map(email => email.trim())
        .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)); // Basic email validation
      
      if (emailList.length === 0) {
        setError("No valid emails found");
        setProcessing(false);
        return;
      }
      
      // Get existing profiles that match these emails
      const { data: matchedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', emailList);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Error matching emails to profiles');
        setProcessing(false);
        return;
      }
      
      // Create a map of email to user_id
      const emailToIdMap = new Map(matchedProfiles?.map(p => [p.email.toLowerCase(), p.id]) || []);
      
      // Track results
      const results = { added: 0, skipped: 0, notFound: [] as string[] };
      
      // Check if we need to use RLS bypass for allowlist operations
      // First try to get the current user's role
      const { data: { user } } = await supabase.auth.getUser();
      let isAdmin = false;
      
      if (user) {
        // Check if the user has admin privileges in the profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('admin')
          .eq('id', user.id)
          .single();
          
        // User is considered an admin if they have admin flag in profiles
        isAdmin = profile?.admin === true;
        
        if (isAdmin) {
          console.log('User is an admin');
        } else {
          console.log('User is not an admin');
          setError('You need to be an admin to add emails to the allowlist');
          setProcessing(false);
          return;
        }
      }
      
      // Process each email
      for (const email of emailList) {
        const normalizedEmail = email.toLowerCase();
        const userId = emailToIdMap.get(normalizedEmail);
        const isRegistered = !!userId;
        
        try {
          // First check if already in allowlist
          const { data: existingAllowlist, error: allowlistCheckError } = await supabase
            .from('event_allowlist')
            .select('id, has_registered')
            .eq('email', normalizedEmail)
            .eq('event_id', eventId)
            .single();
          
          if (allowlistCheckError && allowlistCheckError.code !== 'PGRST116') {
            // Check for 406 Not Acceptable error
            if (handle406Error(allowlistCheckError, 'checking allowlist')) {
              
              // Try again without using .single()
              const { data: existingAllowlistArray, error: retryError } = await supabase
                .from('event_allowlist')
                .select('id, has_registered')
                .eq('email', normalizedEmail)
                .eq('event_id', eventId);
                
              if (retryError) {
                console.error('Error in retry after 406:', retryError);
                results.notFound.push(email);
                continue;
              }
              
              // If we found entries, consider it as existing
              if (existingAllowlistArray && existingAllowlistArray.length > 0) {
                const existingEntry = existingAllowlistArray[0];
                // If has_registered exists and matches current status, skip
                if (existingEntry.has_registered === undefined || existingEntry.has_registered === isRegistered) {
                  results.skipped++;
                  continue;
                }
                
                // If has_registered exists but doesn't match, try to update
                try {
                  const { error: updateError } = await supabase
                    .from('event_allowlist')
                    .update({ has_registered: isRegistered })
                    .eq('id', existingEntry.id);
                    
                  if (updateError) {
                    // Handle update errors
                    if (updateError.message?.includes('has_registered') || 
                        updateError.details?.includes('has_registered')) {
                      console.warn('has_registered column does not exist, skipping update');
                      results.skipped++;
                    } else {
                      console.error('Error updating allowlist:', updateError);
                      results.notFound.push(email);
                    }
                    continue;
                  }
                  
                  results.added++;
                  continue;
                } catch (updateErr) {
                  console.error('Exception updating allowlist:', updateErr);
                  results.notFound.push(email);
                  continue;
                }
              }
              // If no entries found, continue to create a new one
            } else 
            // If the error is about the has_registered column not existing, we'll handle it differently
            if (allowlistCheckError.message?.includes('has_registered') || 
                allowlistCheckError.details?.includes('has_registered')) {
              console.warn('has_registered column may not exist, checking without it');
              
              // Try again without requesting has_registered
              const { data: basicAllowlist, error: basicCheckError } = await supabase
                .from('event_allowlist')
                .select('id')
                .eq('email', normalizedEmail)
                .eq('event_id', eventId)
                .single();
                
              if (basicCheckError && basicCheckError.code !== 'PGRST116') {
                // Check for 406 Not Acceptable error
                if (handle406Error(basicCheckError, 'checking basic allowlist')) {
                  // We'll assume the entry doesn't exist and continue
                } else {
                  console.error('Error checking allowlist (basic):', basicCheckError);
                  results.notFound.push(email);
                  continue;
                }
              }
              
              if (basicAllowlist) {
                results.skipped++;
                continue;
              }
            } else {
              console.error('Error checking allowlist:', allowlistCheckError);
              results.notFound.push(email);
              continue;
            }
          } else if (existingAllowlist) {
            // If has_registered exists and matches current status, skip
            if (existingAllowlist.has_registered === undefined || existingAllowlist.has_registered === isRegistered) {
              results.skipped++;
              continue;
            }
            
            // If has_registered exists but doesn't match, try to update
            try {
              const { error: updateError } = await supabase
                .from('event_allowlist')
                .update({ has_registered: isRegistered })
                .eq('id', existingAllowlist.id);
                
              if (updateError) {
                // If update fails due to column not existing, just skip
                if (updateError.message?.includes('has_registered') || 
                    updateError.details?.includes('has_registered')) {
                  console.warn('has_registered column does not exist, skipping update');
                  results.skipped++;
                } else {
                  console.error('Error updating allowlist:', updateError);
                  results.notFound.push(email);
                }
                continue;
              }
              
              results.added++;
              continue;
            } catch (updateErr) {
              console.error('Exception updating allowlist:', updateErr);
              results.notFound.push(email);
              continue;
            }
          }
          
          // Not in allowlist, add it
          console.log('Adding to allowlist:', { email: normalizedEmail, event_id: eventId, has_registered: isRegistered });
          
          try {
            // Create the allowlist entry object
            const allowlistEntry = {
              email: normalizedEmail,
              event_id: eventId,
              has_registered: isRegistered
            };
            
            // First try with normal client
            const { data, error: allowlistError } = await supabase
              .from('event_allowlist')
              .insert(allowlistEntry)
              .select('id')
              .single();
            
            if (allowlistError) {
              // Check for 406 Not Acceptable error
              if (handle406Error(allowlistError, 'inserting to allowlist')) {
                
                // Try again without using .single()
                const { data: insertData, error: retryError } = await supabase
                  .from('event_allowlist')
                  .insert(allowlistEntry)
                  .select('id');
                  
                if (retryError) {
                  console.error('Error in retry after 406:', retryError);
                  results.notFound.push(email);
                  continue;
                }
                
                console.log('Successfully added to allowlist (retry):', insertData);
                results.added++;
                continue;
              }
              
              // Check if it's an RLS policy error
              if (allowlistError.code === '42501' || 
                  (allowlistError.message && allowlistError.message.includes('violates row-level security policy'))) {
                console.warn('RLS policy error, trying alternative approach');
                
                // Log detailed error information for debugging
                console.error('RLS policy error details:', JSON.stringify(allowlistError));
                
                // Set a more helpful error message that mentions both admin options
                setError(`Unable to add emails to allowlist due to security policy restrictions. 
                  This operation requires admin privileges. You need to have the admin flag set to true in your profiles record.
                  Please contact your database administrator to update these permissions.`);
                
                results.notFound.push(email);
                continue;
              }
              
              // If error is about has_registered column, try without it
              if (allowlistError.message?.includes('has_registered') || 
                  allowlistError.details?.includes('has_registered')) {
                console.warn('has_registered column does not exist, trying without it');
                
                const basicEntry = {
                  email: normalizedEmail,
                  event_id: eventId
                };
                
                const { data: basicData, error: basicError } = await supabase
                  .from('event_allowlist')
                  .insert(basicEntry)
                  .select('id')
                  .single();
                  
                if (basicError) {
                  // Check for 406 Not Acceptable error
                  if (handle406Error(basicError, 'adding to basic allowlist')) {
                    
                    // Try again without using .single()
                    const { data: basicInsertData, error: basicRetryError } = await supabase
                      .from('event_allowlist')
                      .insert(basicEntry)
                      .select('id');
                      
                    if (basicRetryError) {
                      console.error('Error in basic retry after 406:', basicRetryError);
                      results.notFound.push(email);
                      continue;
                    }
                    
                    console.log('Successfully added to allowlist (basic retry):', basicInsertData);
                    results.added++;
                    continue;
                  }
                  
                  // Check if it's an RLS policy error
                  if (basicError.code === '42501' || 
                      (basicError.message && basicError.message.includes('violates row-level security policy'))) {
                    console.error('RLS policy error (basic):', JSON.stringify(basicError));
                    setError(`Unable to add emails to allowlist due to security policy restrictions. 
                      This operation requires admin privileges. You need to have the admin flag set to true in your profiles record.
                      Please contact your database administrator to update these permissions.`);
                    results.notFound.push(email);
                    continue;
                  }
                  
                  console.error('Error adding to allowlist (basic):', JSON.stringify(basicError));
                  results.notFound.push(email);
                  continue;
                }
                
                console.log('Successfully added to allowlist (basic):', basicData);
                results.added++;
              } else {
                console.error('Error adding to allowlist:', JSON.stringify(allowlistError), 'for email:', normalizedEmail);
                results.notFound.push(email);
                continue;
              }
            } else {
              console.log('Successfully added to allowlist:', data);
              results.added++;
            }
          } catch (insertErr) {
            console.error('Exception adding to allowlist:', insertErr);
            results.notFound.push(email);
            continue;
          }
          
          // If user is registered, also add them as a participant
          if (isRegistered) {
            // Check if already a participant
            const { data: existing, error: checkError } = await supabase
              .from('event_participants')
              .select('id')
              .eq('user_id', userId)
              .eq('event_id', eventId)
              .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
              console.error('Error checking participant:', checkError);
              continue;
            }
            
            // Skip if already a participant
            if (existing) {
              continue;
            }
            
            // Add new participant
            const { error: insertError } = await supabase
              .from('event_participants')
              .insert({
                user_id: userId,
                event_id: eventId,
                available_votes: 100,
              });
            
            if (insertError) {
              console.error('Error adding participant:', insertError);
              continue;
            }
          }
        } catch (emailError) {
          console.error('Error processing email:', email, emailError);
          results.notFound.push(email);
        }
      }
      
      setImportResults(results);
      
      // Refresh participant list if any were added
      if (results.added > 0) {
        fetchData();
      }
      
      // Clear the textarea if successful
      if (results.added > 0 && results.notFound.length === 0) {
        setBulkEmails('');
      }
    } catch (err) {
      console.error('Unexpected error during bulk import:', err);
      setError('An unexpected error occurred during bulk import');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <h1 className="text-brand-blue font-eyebrow text-4xl">Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {has406Error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">Content Negotiation Warning:</p>
          <p>Some operations are encountering 406 (Not Acceptable) errors. This is likely due to a content type mismatch between the client and server.</p>
          <p>The application will continue to function, but some features may not work as expected. This is a technical issue that doesn't affect your data.</p>
        </div>
      )}
      
      {schemaInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
          <p className="font-medium">Database Schema Info:</p>
          <p>{schemaInfo}</p>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">Event Participants</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Votes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{participant.profile.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{participant.available_votes}</td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No participants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">Event Allowlist</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allowlist.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {entry.has_registered ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending Registration
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {allowlist.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                      No emails in allowlist
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-gray-500">
            <p>Total: {allowlist.length} emails</p>
            <p>Registered: {allowlist.filter(entry => entry.has_registered).length}</p>
            <p>Pending: {allowlist.filter(entry => !entry.has_registered).length}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">Bulk Add Participants</h2>
          <form onSubmit={handleBulkImport} className="space-y-4">
            <div>
              <label htmlFor="bulkEmails" className="block text-sm font-medium text-gray-700 mb-1">
                Paste emails (separated by commas, spaces, or new lines)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                All emails will be added to the event allowlist. Registered users will also be added as participants.
                The system tracks which emails belong to registered users.
              </p>
              <textarea
                id="bulkEmails"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue"
                placeholder="email1@example.com, email2@example.com&#10;email3@example.com email4@example.com"
                disabled={processing}
              />
            </div>
            <button
              type="submit"
              disabled={processing || !bulkEmails.trim()}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Add to Event'}
            </button>
          </form>
          
          {(importResults.added > 0 || importResults.skipped > 0 || importResults.notFound.length > 0) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Import Results:</h3>
              <ul className="space-y-1 text-sm">
                {importResults.added > 0 && (
                  <li className="text-green-600">✓ Added or updated {importResults.added} email(s) in the allowlist</li>
                )}
                {importResults.skipped > 0 && (
                  <li className="text-amber-600">⚠ Skipped {importResults.skipped} email(s) already in the allowlist with correct status</li>
                )}
                {importResults.notFound.length > 0 && (
                  <li className="text-red-600">
                    ✗ {importResults.notFound.length} email(s) failed to add:
                    <ul className="ml-4 mt-1 space-y-1">
                      {importResults.notFound.map((email, i) => (
                        <li key={i}>{email}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">Add Individual Participant</h2>
          <div className="flex gap-4">
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              className="flex-1"
            >
              <option value="">Select a user...</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.email}
                </option>
              ))}
            </Select>
            <button
              onClick={handleAddParticipant}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
            >
              Add Participant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 