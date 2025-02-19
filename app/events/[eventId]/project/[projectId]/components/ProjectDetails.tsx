"use client";

import { Project } from "@/types/project";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

interface ProjectDetailsProps {
  project: Project;
}

interface Allocation {
  id: string;
  votes: number;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
  }[] | null;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const [votes, setVotes] = useState({ total: 0, unique: 0 });
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchVotes();
    fetchAllocations();

    // Set up real-time subscription
    const client = createClient();
    const channel = client
      .channel('project_details')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'project_allocations',
        filter: `project_id=eq.${project.id}` 
      }, () => {
        fetchVotes();
        fetchAllocations();
      })
      .subscribe();
      console.log('subscribed to project allocations');

    return () => {
      channel.unsubscribe();
    };
  }, [project.id]);

  async function fetchAllocations() {
    const client = createClient();
    
    // First fetch allocations
    const { data: allocationsData } = await client
      .from("project_allocations")
      .select(`
        id,
        votes,
        created_at,
        user_id
      `)
      .eq("project_id", project.id)
      .gt("votes", 0)  // Only get allocations with votes > 0
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allocationsData) return;

    // Then fetch profiles for those allocations
    const userIds = allocationsData.map(a => a.user_id);
    const { data: profilesData } = await client
      .from("profiles")
      .select("id, name")
      .in("id", userIds);

    if (!profilesData) return;

    // Create a map of user_id to profile for easier lookup
    const profileMap = new Map(profilesData.map(p => [p.id, p]));

    // Join the data
    const formattedData = allocationsData.map(item => ({
      ...item,
      profiles: profileMap.has(item.user_id) ? [{ name: profileMap.get(item.user_id)!.name }] : null
    }));

    setAllocations(formattedData as Allocation[]);
  }

  async function fetchVotes() {
    const client = createClient();
    const { data: allAllocations } = await client
      .from("project_allocations")
      .select("votes, user_id")
      .eq("project_id", project.id);

    if (allAllocations) {
      const totalVotes = allAllocations.reduce((sum, allocation) => sum + allocation.votes, 0);
      const uniqueVoters = new Set(allAllocations.map(a => a.user_id)).size;
      setVotes({
        total: totalVotes,
        unique: uniqueVoters
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-brand-blue font-title text-4xl">{project.name}</h1>
        <p className="text-brand-blue font-eyebrow text-xl">{votes.total} Votes</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-brand-blue font-eyebrow text-2xl">Recent Allocations</h2>
        <div className="space-y-2">
          {allocations.map((allocation) => (
            <div 
              key={allocation.id} 
              className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"
            >
              <div className="space-y-1">
                <div className="text-brand-blue font-medium">
                  {allocation.profiles?.[0]?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(allocation.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-brand-blue font-semibold">
                {allocation.votes} votes
              </div>
            </div>
          ))}
          {allocations.length === 0 && (
            <p className="text-gray-500 text-center py-4">No allocations yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
