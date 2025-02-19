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
    fetchVotes();
    fetchAllocations();
  }, [project.id]);

  async function fetchAllocations() {
    const client = createClient();
    
    const { data: allocationsData } = await client
      .from("project_allocations")
      .select(`
        id,
        votes,
        created_at,
        user_id
      `)
      .eq("project_id", project.id)
      .gt("votes", 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allocationsData) return;

    const userIds = allocationsData.map(a => a.user_id);
    const { data: profilesData } = await client
      .from("profiles")
      .select("id, name")
      .in("id", userIds);

    if (!profilesData) return;

    const profileMap = new Map(profilesData.map(p => [p.id, p]));
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
          {allocations.map((allocation) => {
            const timeAgo = getTimeAgo(new Date(allocation.created_at));
            return (
              <div 
                key={allocation.id} 
                className="text-brand-blue font-eyebrow text-lg"
              >
                {timeAgo} | {allocation.profiles?.[0]?.name} | {allocation.votes}
              </div>
            );
          })}
          {allocations.length === 0 && (
            <p className="text-gray-500 text-center py-4">No allocations yet</p>
          )}
        </div>
      </div>
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
