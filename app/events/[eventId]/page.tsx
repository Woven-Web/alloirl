import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import Link from "next/link";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const supabase = await createClient();
  const eventId = (await params).eventId;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  // Check if user is an admin
  const { data: participant } = user ? await supabase
    .from('event_participants')
    .select('is_admin')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .single() : { data: null };

  const isAdmin = participant?.is_admin ?? false;

  // Fetch projects associated with this event
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("event_id", eventId);

  return (
    <div className="flex flex-col w-full px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-brand-blue font-eyebrow text-4xl">{event.name}</h1>
        {isAdmin && (
          <Link 
            href={`/events/${eventId}/admin`}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90"
          >
            Admin Dashboard
          </Link>
        )}
      </div>
      
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
