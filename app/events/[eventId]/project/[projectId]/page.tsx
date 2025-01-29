import { notFound } from "next/navigation";
import { ProjectDetails } from "./components/ProjectDetails";
import { createClient } from "@/utils/supabase/server";
import { VoteAllocation } from "./components/VoteAllocation";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string; eventId: string }>;
}) {
  const supabase = await createClient();
  const { projectId, eventId } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch project details - this is readable by everyone due to RLS
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  // Fetch participant data if user is logged in
  const participantData = user ? await supabase
    .from("event_participants")
    .select("*, events_public(id, name)")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single()
    .then(({ data }) => data) : null;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProjectDetails project={project} />
        
        {/* Only show voting section if user is logged in */}
        {user && (
          <VoteAllocation 
            participantData={participantData}
            projectId={projectId}
            eventId={eventId}
          />
        )}
      </div>
    </main>
  );
}
