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
          />
        </div>
      )}
    </div>
  );
}
