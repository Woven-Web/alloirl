"use client";

import { useEffect, useState } from "react";
import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

import { Select } from "@/components/ui/select";

type Project = {
  id?: string;
  name: string | null;
};

type Event = {
  id?: string;
  name: string | null;
};

type ContactlessLink = {
  id: number;
  slug: string;
  created_at: string;
  project: Project | null;
  event: Event | null;
};

interface LinksTableProps {
  projects: Project[];
  events: Event[];
  initialLinks?: ContactlessLink[];
}

const LinksTable = ({ initialLinks = [], projects, events }: LinksTableProps) => {
  const supabase = createClient();
  const [links, setLinks] = useState<ContactlessLink[]>(initialLinks);
  const [_, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const handleLinkUpdate = async (linkId: number, newEntityId: string, entityType: 'project' | 'event') => {
    try {
      setIsUpdating(linkId);
      
      // Prepare update data based on entity type
      const updateData = entityType === 'project' 
        ? { project_id: newEntityId, event_id: null }
        : { project_id: null, event_id: newEntityId };
      
      const { error } = await supabase
        .from("contactless_links")
        .update(updateData)
        .eq("id", linkId);

      if (error) throw error;

      // Update local state
      setLinks(
        links.map((link) => {
          if (link.id === linkId) {
            if (entityType === 'project') {
              const newProject = projects.find((p) => p.id === newEntityId);
              return {
                ...link,
                project: newProject as Project,
                event: null,
              };
            } else {
              const newEvent = events.find((e) => e.id === newEntityId);
              return {
                ...link,
                project: null,
                event: newEvent as Event,
              };
            }
          }
          return link;
        }),
      );
    } catch (err) {
      setError(err as PostgrestError);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (link: ContactlessLink) => {
    try {
      // Show confirmation dialog
      const isConfirmed = window.confirm(
        `Are you sure you want to delete the link with slug "${link.slug}"? This action cannot be undone.`,
      );

      if (!isConfirmed) return;

      setIsDeleting(link.id);
      const { error } = await supabase
        .from("contactless_links")
        .delete()
        .eq("id", link.id);

      if (error) {
        throw error;
      }

      // Update local state to remove the deleted item
      setLinks(links.filter((l) => l.id !== link.id));
    } catch (err) {
      setError(err as PostgrestError);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching contactless links...");
        // Fetch links with both project and event information
        const { data, error } = await supabase.from("contactless_links")
          .select(`
          id,
          slug,
          created_at,
          project:project_id (
            id, 
            name
          ),
          event:event_id (
            id,
            name
          )
        `);

        if (error) {
          console.error("Error fetching links:", error);
          setError(error);
          setIsLoading(false);
          return;
        }

        console.log("Fetched links:", data);
        if (data) {
          setLinks(
            data.map((item: any) => ({
              id: item.id,
              slug: item.slug,
              created_at: item.created_at,
              project: item.project,
              event: item.event
            })) as ContactlessLink[],
          );
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Slug
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Linked To
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {links?.map((link) => (
            <tr key={link.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                {link?.slug}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="relative">
                  <Select
                    value={link.project ? `project_${link.project.id}` : link.event ? `event_${link.event.id}` : ""}
                    onValueChange={(newValue) => {
                      // Determine if this is a project or event ID
                      const isProject = newValue.startsWith('project_');
                      const isEvent = newValue.startsWith('event_');
                      
                      // Extract the actual ID
                      const entityId = isProject 
                        ? newValue.replace('project_', '') 
                        : newValue.replace('event_', '');
                      
                      // Update with the appropriate type
                      handleLinkUpdate(
                        link.id, 
                        entityId, 
                        isProject ? 'project' : 'event'
                      );
                    }}
                    disabled={isUpdating === link.id}
                    className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
                  >
                    <optgroup label="Projects">
                      {projects.map((project) => (
                        <option key={`project_${project.id}`} value={`project_${project.id}`}>
                          {project.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Events">
                      {events.map((event) => (
                        <option key={`event_${event.id}`} value={`event_${event.id}`}>
                          {event.name}
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                  {isUpdating === link.id && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue"></div>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {link.project ? "Project" : "Event"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(link.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <button
                  onClick={() => handleDelete(link)}
                  disabled={isDeleting === link.id}
                  className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Delete link ${link.slug}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
          {links?.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No links found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LinksTable;
