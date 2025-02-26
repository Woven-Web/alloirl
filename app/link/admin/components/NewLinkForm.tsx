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

type Event = {
  id?: string;
  name: string | null;
  description?: string | null;
  created_at?: string;
};

interface NewLinkFormProps {
  projects: Project[];
  events: Event[];
}

const NewLinkForm = ({ projects, events }: NewLinkFormProps) => {
  const supabase = createClient();
  const [slug, setSlug] = useState("");
  const [linkType, setLinkType] = useState<"project" | "event">("project");
  const [entityId, setEntityId] = useState<string | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !entityId) return;

    setIsSubmitting(true);
    try {
      // Prepare data based on link type
      const insertData = linkType === "project" 
        ? { slug, project_id: entityId, event_id: null }
        : { slug, project_id: null, event_id: entityId };
      
      console.log("Inserting data:", insertData);
      
      const { data, error } = await supabase.from("contactless_links").insert(insertData);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Insert successful:", data);

      // Reset form
      setSlug("");
      setEntityId(null);
      
      // Refresh the page to show new link
      window.location.reload();
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(err as PostgrestError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
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
          pattern="[a-z0-9\-]+"
          title="Lowercase letters, numbers, and hyphens only"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="linkType"
          className="block text-sm font-medium text-gray-700"
        >
          Link Type
        </label>
        <Select
          value={linkType}
          onValueChange={(value) => {
            setLinkType(value as "project" | "event");
            setEntityId(null); // Reset entity selection when type changes
          }}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
        >
          <option value="project">Project</option>
          <option value="event">Event</option>
        </Select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="entity"
          className="block text-sm font-medium text-gray-700"
        >
          {linkType === "project" ? "Project" : "Event"}
        </label>
        <Select
          value={entityId || ""}
          onValueChange={setEntityId}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
        >
          <option value="">Select a {linkType}</option>
          {linkType === "project" ? (
            projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))
          ) : (
            events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))
          )}
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
        disabled={isSubmitting || !slug || !entityId}
        className="inline-flex items-center justify-center rounded-md bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Link"}
      </button>
    </form>
  );
};

export default NewLinkForm;
