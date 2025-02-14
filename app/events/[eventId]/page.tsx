import { createClient } from "@/utils/supabase/client";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import Link from "next/link";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const supabase = createClient();

  const eventId = (await params).eventId

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  // Fetch projects associated with this event
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("event_id", eventId);

  return (
    <div className="flex flex-col w-full px-4 space-y-8">
      <h1 className="text-brand-blue font-eyebrow text-4xl">{event.name}</h1>
      
      <div className="space-y-4">
        <h2 className="text-brand-blue font-eyebrow text-4xl">Projects</h2>
        
        {projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/events/${eventId}/project/${project.id}`} 
                className="block text-brand-blue font-eyebrow text-xl hover:opacity-80"
              >
                {project.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-brand-blue font-eyebrow">No projects yet</p>
        )}
      </div>
    </div>
  );
}
