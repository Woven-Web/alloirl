"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Project = {
  id?: string;
  name: string | null;
};

type NewLinkFormProps = { projects: Project[] };

const NewLinkForm: React.FC<NewLinkFormProps> = ({ projects }) => {
  const supabase = createClient();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    projectId: string | null;
    slug: string;
  }>({
    name: "",
    projectId: null,
    slug: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.projectId) return;

    try {
      setIsCreating(true);
      const { error } = await supabase
        .from("project_contactless_links")
        .insert({
          name: formData.name,
          project_id: formData.projectId,
          slug: formData.slug,
        })
        .select(
          `
          id,
          name,
          slug,
          project:project_id (
            id, name
          )
        `,
        )
        .single();

      if (error) throw error;
    } catch (err) {
      setError(err as PostgrestError);
    } finally {
      setIsCreating(false);
      window.location.reload();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-6 space-y-4 w-full"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error.message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <Input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
            placeholder="Enter link name"
            required
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700"
          >
            Slug
          </label>
          <Input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
            placeholder="Enter slug"
            required
          />
        </div>

        <div>
          <label
            htmlFor="project"
            className="block text-sm font-medium text-gray-700"
          >
            Project
          </label>
          <Select
            id="project"
            value={formData.projectId || ""}
            onValueChange={(newValue: string) =>
              setFormData({ ...formData, projectId: newValue })
            }
            className="mt-1 block w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
            required
          >
            <option value="" disabled>
              Select a project
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isCreating || !formData.name || !formData.projectId}
          className="w-full px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            "Add Link"
          )}
        </button>
      </div>
    </form>
  );
};

export default NewLinkForm;
