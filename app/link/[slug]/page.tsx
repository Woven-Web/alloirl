import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectWithEvent } from "@/types/project";

interface ContactlessLink {
  id: number;
  slug: string;
  project: {
    id: string;
    name: string | null;
    event: {
      id: string;
      name: string | null;
    } | null;
  } | null;
  event: {
    id: string;
    name: string | null;
  } | null;
}

export default async function ContactlessRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const slug = (await params).slug;

  const { data, error } = await supabase
    .from("contactless_links")
    .select(
      `
      id,
      slug,
      project:project_id ( 
        id, 
        name,
        event:event_id ( id, name )
      ),
      event:event_id (
        id,
        name
      )
    `,
    )
    .eq("slug", slug)
    .single() as { data: ContactlessLink | null; error: any };

  if (error) {
    return notFound();
  }

  // Handle project link (possibly with event)
  if (data?.project) {
    const projectId = data.project.id;
    const eventId = data.project.event?.id;

    if (projectId && eventId) {
      return redirect(`/events/${eventId}/project/${projectId}`);
    } else if (projectId) {
      return redirect(`/projects/${projectId}`);
    }
  }

  // Handle direct event link
  if (data?.event) {
    return redirect(`/events/${data.event.id}`);
  }

  return notFound();
}
