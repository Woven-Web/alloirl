import { createClient } from "@/utils/supabase/client";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ProjectDetails } from "./components/ProjectDetails";
import { Allocate } from "./components/Allocate";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const supabase = createClient();
  const projectId = (await params).projectId;

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  
  if (!project) {
    notFound();
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Only fetch user votes if logged in
  let userData = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("available_votes")
      .eq("id", user.id)
      .single();
    userData = data;
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProjectDetails project={project} />
        {user && userData && (
          <Allocate 
            project={project}
            user={{
              id: user.id,
              name: user.email || 'Anonymous',
              available_votes: userData.available_votes
            }}
            onAllocate={async (votes) => {
              'use server';
              const supabase = createClient();
              
              // Start a transaction
              const { error: updateError } = await supabase
                .from("users")
                .update({ 
                  available_votes: userData.available_votes - votes 
                })
                .eq("id", user.id);

              if (updateError) throw updateError;

              const { error: insertError } = await supabase
                .from("allocations")
                .insert({
                  project_id: projectId,
                  user_id: user.id,
                  votes: votes,
                });

              if (insertError) throw insertError;
            }}
          />
        )}
      </div>
    </main>
  );
}
