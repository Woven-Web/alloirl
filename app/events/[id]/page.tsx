import { createClient } from "@/utils/supabase/client";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Fetch event details
  const { data: event } = await supabase
    .from("events_public")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!event) {
    notFound();
  }

  // Fetch projects associated with this event
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("event_id", params.id);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Event Details Card */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="rounded-lg bg-muted p-4">
                <h2 className="text-sm font-medium text-muted-foreground">Starts</h2>
                <p className="mt-1">
                  {formatDistanceToNow(parseISO(event.start_date))} from now
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h2 className="text-sm font-medium text-muted-foreground">Duration</h2>
                <p className="mt-1">
                  {formatDistanceToNow(parseISO(event.start_date), { 
                    end: parseISO(event.end_date) 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
            {projects && projects.length > 0 ? (
              <div className="mt-4 space-y-4">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">No projects have been submitted for this event yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
