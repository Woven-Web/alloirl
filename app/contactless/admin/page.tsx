import { Suspense } from "react";

import { createClient } from "@/utils/supabase/server";

import LinksTable from "./components/LinksTable";
import NewLinkForm from "./components/NewLinkForm";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: projects } = await supabase.from("projects").select(`
    id,
    name
  `);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <h1 className="text-brand-blue font-eyebrow text-4xl">Link Dashboard</h1>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">
            Configuration
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Suspense
              fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
              }
            >
              <LinksTable projects={projects || []} />
            </Suspense>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-brand-blue font-eyebrow text-2xl">Add Link</h2>
          <div className="flex gap-4">
            <Suspense
              fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
              }
            >
              <NewLinkForm projects={projects || []} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
