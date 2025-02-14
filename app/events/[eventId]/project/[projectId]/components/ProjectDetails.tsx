"use client";

import { Project } from "@/types/project";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

interface ProjectDetailsProps {
  project: Project;
}

interface ProjectVotes {
  total_votes: number;
  unique_voters: number;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const [votes, setVotes] = useState({ total: 0, unique: 0 });

  useEffect(() => {
    // Initial fetch
    fetchVotes();

    // Set up real-time subscription
    const client = createClient();
    const channel = client
      .channel('project_details')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `project_id=eq.${project.id}` 
      }, fetchVotes)
      .subscribe();
      console.log('subscribed to votes');

    return () => {
      channel.unsubscribe();
    };
  }, [project.id]);

  async function fetchVotes() {
    const client = createClient();
    const { data } = await client
      .from("project_votes")
      .select("total_votes, unique_voters")
      .eq("project_id", project.id)
      .single();

    if (data) {
      setVotes({
        total: data.total_votes,
        unique: data.unique_voters
      });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-brand-blue font-title text-4xl">{project.name}</h1>
      <p className="text-brand-blue font-eyebrow text-xl">{votes.total} Votes</p>
    </div>
  );
}
