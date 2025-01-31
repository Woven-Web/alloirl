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
  const { eventId, projectId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  // Get participant data if user is logged in
  const { data: participantData } = user ? await supabase
    .from("event_participants")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single() : { data: null };

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/events/${eventId}`}>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            &larr; All projects
          </span>
        </Link>

        <ProjectDetails project={project} />
        
        {user && (
          <VoteAllocation 
            eventId={eventId}
            projectId={projectId}
            participantData={participantData}
          />
        )}
      </div>
    </main>
  );
}
