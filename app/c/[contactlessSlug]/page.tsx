import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";

export default async function ContactlessRedirectPage({
  params,
}: {
  params: Promise<{ contactlessSlug: string }>;
}) {
  const supabase = await createClient();
  const contactlessSlug = (await params).contactlessSlug;

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
    .eq("slug", contactlessSlug)
    .single();

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
