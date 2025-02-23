import { notFound } from "next/navigation";
import { ProjectDetails } from "./components/ProjectDetails";
import { createClient } from "@/utils/supabase/server";
import { VoteAllocation } from "./components/VoteAllocation";
import Link from "next/link";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ eventId: string; projectId: string }>
}) {
  const startTime = Date.now();
  console.log('Starting project page load');

  const { eventId, projectId } = await params;
  const supabase = await createClient();

  console.time('project-page-parallel-fetches');
  // Run all independent queries in parallel
  const [
    { data: { user } },
    { data: project },
    { data: projectVotes }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("project_allocations").select("votes").eq("event_id", eventId).eq("project_id", projectId)
  ]);
  console.timeEnd('project-page-parallel-fetches');

  if (!project) {
    notFound();
  }

  // These queries depend on user, so they need to run after we have user data
  console.time('project-page-user-dependent-fetches');
  const [
    { data: participantData },
    { data: currentAllocation }
  ] = user ? await Promise.all([
    supabase
      .from("event_participants")
      .select(`
        *,
        events (
          id,
          name,
          vote_limit
        )
      `)
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("project_allocations")
      .select("votes")
      .eq("event_id", eventId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()
  ]) : [{ data: null }, { data: null }];
  console.timeEnd('project-page-user-dependent-fetches');

  console.time('project-page-vote-calculation');
  const totalVotes = projectVotes?.reduce((sum, allocation) => sum + allocation.votes, 0) || 0;
  console.timeEnd('project-page-vote-calculation');

  const totalTime = Date.now() - startTime;
  console.log(`Total page load time: ${totalTime}ms`);

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      <div className="overflow-y-auto h-full pb-32 px-4">
        <ProjectDetails project={project} />
      </div>
      
      {user && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom)]">
          <VoteAllocation 
            eventId={eventId}
            projectId={projectId}
            participantData={participantData}
            currentAllocation={currentAllocation?.votes || 0}
            totalVotes={totalVotes}
          />
        </div>
      )}
    </div>
  );
}
