import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const MATCHING_POOL = 5000; // Will come from events table later
const THRESHOLD = 25.0; // Same as original QF implementation

// Add CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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

/**
 * Aggregates votes by contributor, similar to the Python implementation
 */
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

/**
 * Calculates pairwise totals between contributors across all projects
 */
function getTotalsByPair(voteDict: Record<string, Record<string, number>>) {
  const pairTotals: Record<string, Record<string, number>> = {};

  // For each project's votes
  for (const projectVotes of Object.values(voteDict)) {
    // For each pair of contributors
    for (const [user1, votes1] of Object.entries(projectVotes)) {
      if (!pairTotals[user1]) {
        pairTotals[user1] = {};
      }

      for (const [user2, votes2] of Object.entries(projectVotes)) {
        if (!pairTotals[user1][user2]) {
          pairTotals[user1][user2] = 0;
        }
        // Use sqrt of vote products, same as original QF
        pairTotals[user1][user2] += Math.sqrt(votes1 * votes2);
      }
    }
  }

  return pairTotals;
}

/**
 * Calculates the QF matching amounts for each project
 */
function calculateMatching(
  voteDict: Record<string, Record<string, number>>,
  pairTotals: Record<string, Record<string, number>>,
  threshold: number,
  matchingPool: number
): MatchingResult[] {
  let totalMatching = 0;
  const results: MatchingResult[] = [];

  // Calculate raw matching amounts
  for (const [projectId, votes] of Object.entries(voteDict)) {
    let matchingAmount = 0;
    let numContributions = 0;
    let totalVotes = 0;

    const contributors = Object.entries(votes);
    
    // For each contributor
    for (const [user1, votes1] of contributors) {
      numContributions++;
      totalVotes += votes1;
      
      // // Square root of individual contribution
      matchingAmount += Math.sqrt(votes1);
      
      // Add pairwise matches
      for (const [user2, votes2] of contributors) {
        if (user2 > user1) { // Only count each pair once
          matchingAmount += Math.sqrt(votes1 * votes2) / (pairTotals[user1][user2] / (threshold + 1));
        }
      }
    }

    // Handle complex numbers (shouldn't happen with votes but keeping the check)
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

  // Always normalize to exactly match the matching pool
  const normalizationFactor = matchingPool / totalMatching;
  results.forEach(result => {
    result.matching_amount *= normalizationFactor;
    // Round to 2 decimal places since this is currency
    result.matching_amount = Math.round(result.matching_amount * 100) / 100;
  });

  return results;
}

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    // Get all allocations for this event
    const { data: allocations, error } = await supabase
      .from('project_allocations')
      .select('project_id, user_id, votes')
      .eq('event_id', eventId)
      .gt('votes', 0);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch allocations' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!allocations || allocations.length === 0) {
      return NextResponse.json(
        { error: 'No allocations found for this event' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Aggregate votes
    const voteDict = aggregateVotes(allocations);
    
    // Calculate pair totals
    const pairTotals = getTotalsByPair(voteDict);
    
    // Calculate matching amounts
    const results = calculateMatching(voteDict, pairTotals, THRESHOLD, MATCHING_POOL);

    // Add timing metadata to response
    return NextResponse.json({
      results,
      metadata: {
        total_allocations: allocations.length,
        total_projects: Object.keys(voteDict).length,
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error calculating matching amounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 