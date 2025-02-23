'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Profile {
  id: string;
  name: string;
}

interface Allocation {
  id: string;
  votes: number;
  created_at: string;
  projects: {
    id: string;
    name: string;
    event_id: string;
  };
}

interface EventParticipation {
  id: string;
  available_votes: number;
  events: {
    id: string;
    name: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [participations, setParticipations] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch recent allocations
      const { data: allocationsData } = await supabase
        .from('project_allocations')
        .select(`
          id,
          votes,
          created_at,
          projects (
            id,
            name,
            event_id
          )
        `)
        .eq('user_id', user.id)
        .gt('votes', 0)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch event participations
      const { data: participationsData } = await supabase
        .from('event_participants')
        .select(`
          id,
          available_votes,
          events (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      setProfile(profileData);
      
      // Transform allocations data to ensure projects is a single object
      const transformedAllocations = (allocationsData || []).map(a => ({
        ...a,
        projects: Array.isArray(a.projects) ? a.projects[0] : a.projects
      })) as Allocation[];
      setAllocations(transformedAllocations);

      // Transform participations data to ensure events is a single object
      const transformedParticipations = (participationsData || []).map(p => ({
        ...p,
        events: Array.isArray(p.events) ? p.events[0] : p.events
      })) as EventParticipation[];
      setParticipations(transformedParticipations);
      setLoading(false);
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-4">Profile not found</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-brand-blue">{profile.name}</h1>
        <Link href="/profile/edit">
          <Button variant="outline">Edit Profile</Button>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-brand-blue font-eyebrow text-2xl">My Allocations</h2>
        <div className="space-y-2">
          {allocations.map((allocation) => {
            const timeAgo = getTimeAgo(new Date(allocation.created_at));
            return (
              <div 
                key={allocation.id} 
                className="text-brand-blue font-eyebrow text-lg"
              >
                <Link href={`/events/${allocation.projects.event_id}/project/${allocation.projects.id}`} className="hover:underline">{allocation.projects.name}</Link> | {allocation.votes} {allocation.votes === 1 ? 'vote' : 'votes'}
              </div>
            );
          })}
          {allocations.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent allocations</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-blue">Active Rounds</h2>
        {participations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {participations.map((participation) => (
              <Link
                key={participation.id}
                href={`/events/${participation.events.id}`}
                className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="font-medium">{participation.events.name}</div>
                <div className="text-sm text-gray-500">
                  {participation.available_votes} votes remaining
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Not participating in any rounds</p>
        )}
      </section>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes === 1) return '1 min';
  if (diffInMinutes < 60) return `${diffInMinutes} mins`;
  
  const hours = Math.floor(diffInMinutes / 60);
  if (hours === 1) return '1 hour';
  if (hours < 24) return `${hours} hours`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  return `${days} days`;
}
