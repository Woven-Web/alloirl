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
    <div className="h-[calc(100vh-4rem)] flex flex-col px-4 space-y-8 overflow-hidden">
      <ProjectDetails project={project} />
      
      {user && (
        <VoteAllocation 
          eventId={eventId}
          projectId={projectId}
          participantData={participantData}
        />
      )}
    </div>
  );
}
