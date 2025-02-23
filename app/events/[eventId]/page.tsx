import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import Link from "next/link";

const MATCHING_POOL = 5000; // Will come from events table later
const THRESHOLD = 25.0;

interface ProjectAllocation {
  project_id: string;
  user_id: string;
  votes: number;
}

interface MatchingResult {
  project_id: string;
  matching_amount: number;
  number_contributions: number;
  contribution_amount: number;
}

function aggregateVotes(allocations: ProjectAllocation[]) {
  const voteDict: Record<string, Record<string, number>> = {};
  
  for (const allocation of allocations) {
    if (!voteDict[allocation.project_id]) {
      voteDict[allocation.project_id] = {};
    }
    voteDict[allocation.project_id][allocation.user_id] = allocation.votes;
  }
  
  return voteDict;
}

function getTotalsByPair(voteDict: Record<string, Record<string, number>>) {
  const pairTotals: Record<string, Record<string, number>> = {};

  for (const projectVotes of Object.values(voteDict)) {
    for (const [user1, votes1] of Object.entries(projectVotes)) {
      if (!pairTotals[user1]) {
        pairTotals[user1] = {};
      }

      for (const [user2, votes2] of Object.entries(projectVotes)) {
        if (!pairTotals[user1][user2]) {
          pairTotals[user1][user2] = 0;
        }
        pairTotals[user1][user2] += Math.sqrt(votes1 * votes2);
      }
    }
  }

  return pairTotals;
}

function calculateMatching(
  voteDict: Record<string, Record<string, number>>,
  pairTotals: Record<string, Record<string, number>>,
  threshold: number,
  matchingPool: number
): MatchingResult[] {
  let totalMatching = 0;
  const results: MatchingResult[] = [];

  for (const [projectId, votes] of Object.entries(voteDict)) {
    let matchingAmount = 0;
    let numContributions = 0;
    let totalVotes = 0;

    const contributors = Object.entries(votes);
    
    for (const [user1, votes1] of contributors) {
      numContributions++;
      totalVotes += votes1;
      
      matchingAmount += Math.sqrt(votes1);
      
      for (const [user2, votes2] of contributors) {
        if (user2 > user1) {
          matchingAmount += Math.sqrt(votes1 * votes2) / (pairTotals[user1][user2] / (threshold + 1));
        }
      }
    }

    if (typeof matchingAmount === 'number' && !isNaN(matchingAmount)) {
      totalMatching += matchingAmount;
      results.push({
        project_id: projectId,
        matching_amount: matchingAmount,
        number_contributions: numContributions,
        contribution_amount: totalVotes
      });
    }
  }

  const normalizationFactor = matchingPool / totalMatching;
  results.forEach(result => {
    result.matching_amount *= normalizationFactor;
    result.matching_amount = Math.round(result.matching_amount * 100) / 100;
  });

  return results;
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const startTime = Date.now();
  console.log('Starting event page load');
  
  const supabase = await createClient();
  const eventId = (await params).eventId;

  // Run all independent queries in parallel
  const [
    { data: { user } },
    { data: event },
    { data: allocations },
    { data: projects }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from('project_allocations').select('project_id, user_id, votes').eq('event_id', eventId).gt('votes', 0),
    supabase.from("projects").select('*, project_allocations(votes)').eq("event_id", eventId)
  ]);

  if (!event) {
    notFound();
  }

  // Check if user is an admin - this needs to wait for user
  const { data: participant } = user ? await supabase
    .from('event_participants')
    .select('is_admin')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .single() : { data: null };

  const isAdmin = participant?.is_admin ?? false;

  // Calculate matching amounts
  const voteDict = aggregateVotes(allocations || []);
  const pairTotals = getTotalsByPair(voteDict);
  const matchingResults = calculateMatching(voteDict, pairTotals, THRESHOLD, MATCHING_POOL);
  const matchingMap = new Map(matchingResults.map(result => [result.project_id, result]));

  // Calculate total votes for each project and sort by votes
  const projectsWithVotes = projects?.map(project => ({
    ...project,
    total_votes: project.project_allocations?.reduce((sum: number, allocation: { votes: number | null }) => 
      sum + (allocation.votes || 0), 0) || 0,
    matching_amount: matchingMap.get(project.id)?.matching_amount || 0
  }))
  .sort((a, b) => b.total_votes - a.total_votes);

  const totalTime = Date.now() - startTime;
  console.log(`Total page load time: ${totalTime}ms`);

  return (
    <div className="flex flex-col w-full px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-brand-blue font-eyebrow text-4xl">{event.name}</h1>
        {isAdmin && (
          <Link 
            href={`/events/${eventId}/admin`}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90"
          >
            Admin Dashboard
          </Link>
        )}
      </div>
      
      <div className="space-y-4">
        <h2 className="text-brand-blue font-eyebrow text-4xl">Projects</h2>
        
        {projectsWithVotes && projectsWithVotes.length > 0 ? (
          <div className="space-y-4">
            {projectsWithVotes.map((project) => (
              <Link 
                key={project.id} 
                href={`/events/${eventId}/project/${project.id}`} 
                className="flex flex-col sm:flex-row sm:justify-between gap-2 text-brand-blue font-eyebrow text-xl hover:opacity-80 py-2"
              >
                <span className="break-words">{project.name}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg whitespace-nowrap">{project.total_votes} votes</span>
                  <span className="text-lg text-green-600 whitespace-nowrap">~${Math.round(project.matching_amount)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-brand-blue font-eyebrow">No projects yet</p>
        )}
      </div>
    </div>
  );
}
