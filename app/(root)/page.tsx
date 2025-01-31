import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";

export default async function Home() {
  const client = createClient();
  const { data: eventsPublic } = await client.from('events').select('*');

  return (
    <>
      <main className="flex-1 flex flex-col gap-6 px-4">
        <h2 className="font-medium text-xl mb-4">All Events</h2>
        <div className="space-y-4">
          {eventsPublic?.map((event) => (
            <Link 
              href={`/events/${event.id}`} 
              key={event.id}
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{event.name}</h3>
                  <p className="text-gray-600 mt-1">{event.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
