'use client';

import { Project } from '@/types/project';

interface ProjectDetailsProps {
  project: Project;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <div className="bg-gray-600 rounded-lg shadow p-6">
      <h1 className="text-white text-2xl font-bold mb-2">{project.name}</h1>
      {project.description && (
        <p className="text-white">{project.description}</p>
      )}
    </div>
  );
}
