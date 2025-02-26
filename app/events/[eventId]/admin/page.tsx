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

export default function AdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h2 className="text-brand-blue font-eyebrow text-2xl">Add Participant</h2>
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