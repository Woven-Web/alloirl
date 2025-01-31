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
      .channel('votes')
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
    <div className="bg-gray-600 rounded-lg shadow p-6">
      <h1 className="text-white text-2xl font-bold mb-2">{project.name}</h1>
      {project.description && (
        <p className="text-white">{project.description}</p>
      )}
      <div className="mt-4 text-white">
        <p>Total Votes: {votes.total}</p>
        <p>Unique Voters: {votes.unique}</p>
      </div>
    </div>
  );
}
