"use client";

import { useEffect, useState } from "react";
import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

import { Select } from "@/components/ui/select";

type Project = {
  id?: string;
  name: string | null;
};

type ProjectContactlessLink = {
  id: number;
  name: string;
  slug: string;
  project: Project | null;
};

interface LinksTableProps {
  projects: Project[];
  initialLinks?: ProjectContactlessLink[];
}

const LinksTable = ({ initialLinks = [], projects }: LinksTableProps) => {
  const supabase = createClient();
  const [links, setLinks] = useState<ProjectContactlessLink[]>(initialLinks);
  const [_, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const handleProjectChange = async (linkId: number, newProjectId: string) => {
    try {
      setIsUpdating(linkId);
      const { error } = await supabase
        .from("project_contactless_links")
        .update({ project_id: newProjectId })
        .eq("id", Number(linkId));

      if (error) throw error;

      // Update local state
      setLinks(
        links.map((link) => {
          if (link.id === linkId) {
            const newProject = projects.find((p) => p.id === newProjectId);
            return {
              ...link,
              project: newProject as Project,
            };
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

  const handleDelete = async (link: ProjectContactlessLink) => {
    try {
      // Show confirmation dialog
      const isConfirmed = window.confirm(
        `Are you sure you want to delete ${link.name ? '\"' + link.name + '\"' : "this record"}? This action cannot be undone.`,
      );

      if (!isConfirmed) return;

      setIsDeleting(link.id);
      const { data, error } = await supabase
        .from("project_contactless_links")
        .delete()
        .eq("id", Number(link.id));

      if (error) {
        throw error;
      }

      // Update local state to remove the deleted item
      setLinks(links.filter((link) => link.id !== link.id));
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
        // Fetch links
        setIsLoading(true);
        const { data, error } = await supabase.from("project_contactless_links")
          .select(`
          id,
          name,
          slug,
          project:project_id (
            id, name
          )
        `);

        if (error) {
          setError(error);
          setIsLoading(false);
          return;
        }

        setLinks(
          data?.map((item) => ({
            ...item,
            id: item.id,
          })) as ProjectContactlessLink[],
        );
        setIsLoading(false);
      } catch {}
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
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            ID
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Project
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {links?.map((link) => (
          <tr key={link.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {link.id}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {link?.name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {link?.slug}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {link.project && link.project.id && (
                <div className="relative">
                  <Select
                    value={link.project.id}
                    onValueChange={(newValue) =>
                      handleProjectChange(link.id, newValue)
                    }
                    disabled={isUpdating === link.id}
                    className="block w-full h-8 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                  {isUpdating === link.id && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue"></div>
                    </div>
                  )}
                </div>
              )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">
              <button
                onClick={() => handleDelete(link)}
                disabled={isDeleting === link.id}
                className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                aria-label={`Delete ${link.name}`}
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
              colSpan={4}
              className="px-6 py-4 text-center text-sm text-gray-500"
            >
              No project links found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default LinksTable;
