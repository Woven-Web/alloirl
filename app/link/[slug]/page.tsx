import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectWithEvent } from "@/types/project";

interface ContactlessLinkWithProject {
  id: number;
  name: string | null;
  project: ProjectWithEvent;
}

export default async function ContactlessRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const slug = (await params).slug;

  const { data, error } = await supabase
    .from("project_contactless_links")
    .select(
      `
      id,
      name,
      project:project_id ( 
        id, 
        name,
        event:event_id ( id, name )
      )
    `,
    )
    .eq("slug", slug)
    .single() as { data: ContactlessLinkWithProject | null; error: any };

  if (error) {
    return notFound();
  }

  const projectId = data?.project?.id;
  const eventId = data?.project?.event?.id;

  if (projectId && eventId) {
    return redirect(`/events/${eventId}/project/${projectId}`);
  }

  return notFound();
}
