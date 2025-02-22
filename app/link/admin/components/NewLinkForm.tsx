"use client";

import { useState } from "react";
import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

import { Select } from "@/components/ui/select";

type Project = {
  id?: string;
  name: string | null;
  description?: string | null;
  created_at?: string;
  metadata?: any;
};

interface NewLinkFormProps {
  projects: Project[];
}

const NewLinkForm = ({ projects }: NewLinkFormProps) => {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !projectId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("project_contactless_links").insert({
        name,
        slug,
        project_id: projectId,
      });

      if (error) throw error;

      // Reset form
      setName("");
      setSlug("");
      setProjectId(null);
      
      // Refresh the page to show new link
      window.location.reload();
    } catch (err) {
      setError(err as PostgrestError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      {/* <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
          placeholder="Enter a name for this link"
          required
        />
      </div> */}

      <div className="space-y-2">
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700"
        >
          Slug
        </label>
        <input
          type="text"
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
          placeholder="e.g. my-cool-link"
          required
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="project"
          className="block text-sm font-medium text-gray-700"
        >
          Project
        </label>
        <Select
          value={projectId || ""}
          onValueChange={setProjectId}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            {error.message || "An error occurred"}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !name || !slug || !projectId}
        className="inline-flex items-center justify-center rounded-md bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Link"}
      </button>
    </form>
  );
};

export default NewLinkForm;
