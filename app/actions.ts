"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/serverAdmin";

const encodedRedirect = (
  type: "success" | "error",
  path: string,
  message: string
) => redirect(`${path}?message=${encodeURIComponent(message)}&type=${type}`);

const recentImports = new Map<string, number>();
const IMPORT_COOLDOWN = 5000; // 5 seconds

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;

  if (!email) {
    return encodedRedirect("error", "/sign-in", "Email is required");
  }

  const headersList = await headers();
  const origin = headersList.get("origin");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Check your email for the sign-in link"
  );
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/");
};

export const allocateVotes = async (
  projectId: string,
  eventId: string,
  amount: number
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      `/events/${eventId}/projects/${projectId}`,
      "You must be signed in to vote"
    );
  }

  // Get current event participant
  const { data: eventParticipant, error: participantError } = await supabase
    .from("event_participants")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (participantError || !eventParticipant) {
    return encodedRedirect(
      "error",
      `/events/${eventId}/projects/${projectId}`,
      "You are not a participant in this event"
    );
  }

  // Check if they have enough votes
  if (eventParticipant.available_votes < amount) {
    return encodedRedirect(
      "error",
      `/events/${eventId}/projects/${projectId}`,
      "You don't have enough votes"
    );
  }

  // Insert vote
  const { error: voteError } = await supabase.from("votes").insert({
    user_id: user.id,
    project_id: projectId,
    amount,
  });

  if (voteError) {
    return encodedRedirect(
      "error",
      `/events/${eventId}/projects/${projectId}`,
      "Failed to submit vote"
    );
  }

  // Update available votes
  const { error: updateError } = await supabase
    .from("event_participants")
    .update({ available_votes: eventParticipant.available_votes - amount })
    .eq("id", eventParticipant.id);

  if (updateError) {
    return encodedRedirect(
      "error",
      `/events/${eventId}/projects/${projectId}`,
      "Failed to update available votes"
    );
  }

  return encodedRedirect(
    "success",
    `/events/${eventId}/projects/${projectId}`,
    `Successfully allocated ${amount} vote${amount === 1 ? "" : "s"}`
  );
};

export const importGitcoinRound = async (url: string, checkOnly = false) => {
  const supabase = await createAdminClient();

  // Parse URL to get chainId and roundId
  const urlPattern = /round\/([0-9]+)\/([0-9]+)/;
  const match = url.match(urlPattern);
  if (!match) {
    return { error: "Invalid Gitcoin round URL" };
  }

  const [_, chainId, roundId] = match;
  
  // Check if this round was recently imported
  const importKey = `${chainId}-${roundId}`;
  const lastImport = recentImports.get(importKey);
  const now = Date.now();
  
  if (lastImport && now - lastImport < IMPORT_COOLDOWN) {
    return { error: "Please wait a few seconds before trying again" };
  }
  
  recentImports.set(importKey, now);
  
  // Fetch round data from Gitcoin API
  const query = `
    query {
      round(chainId: ${chainId}, id: "${roundId}") {
        id
        roundMetadata
        applications {
          id
          metadata
        }
      }
    }
  `;

  try {
    const response = await fetch(
      "https://grants-stack-indexer-v2.gitcoin.co/graphql",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();
    if (data.errors) {
      return { error: data.errors[0].message };
    }

    const round = data.data.round;
    const metadata = typeof round.roundMetadata === "string"
      ? JSON.parse(round.roundMetadata)
      : round.roundMetadata;

    // Add logging to debug the round ID we're checking
    console.log('Checking for existing event with gitcoin_round_id:', round.id);

    // Check if event already exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from("events")
      .select('id, gitcoin_round_id')
      .eq('gitcoin_round_id', round.id)
      .maybeSingle();

    // Add logging to see what we found
    console.log('Existing event check result:', { existingEvent, fetchError });

    if (fetchError) {
      return { error: `Error checking for existing event: ${fetchError.message}` };
    }

    if (existingEvent) {
      return { error: `This round has already been imported (Event ID: ${existingEvent.id})` };
    }

    // Create event and projects in a single transaction
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        name: metadata.name || `Gitcoin Round ${roundId}`,
        description: metadata.eligibility?.description || "",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        gitcoin_round_id: round.id
      })
      .select()
      .single();

    if (eventError) {
      return { error: eventError.message };
    }

    if (!round.applications || !Array.isArray(round.applications)) {
      return { error: "No applications found in round data" };
    }

    const projects = round.applications.map((application: any) => {
      const metadata =
        typeof application.metadata === "string"
          ? JSON.parse(application.metadata)
          : application.metadata;

      const projectData = metadata.application?.project;

      if (!projectData) {
        return null;
      }

      return {
        event_id: event.id,
        name: projectData.title || "Untitled Project",
        description:
          metadata.application?.answers?.find((a: any) => a.questionId === 4)
            ?.answer || "",
        metadata: {
          gitcoin_id: application.id,
          gitcoin_project_id: projectData.id,
          gitcoin_chain_id: chainId,
          gitcoin_round_id: roundId,
          application_answers: metadata.application?.answers || [],
          project_data: projectData,
        },
      };
    }).filter((p: unknown) => p !== null);

    if (projects.length === 0) {
      return { error: "No valid projects found in applications" };
    }

    if (checkOnly) {
      return { projectCount: projects.length };
    }

    // Create projects immediately after event creation
    const { error: createError } = await supabase
      .from("projects")
      .insert(projects);

    if (createError) {
      // If project creation fails, we should probably delete the event
      await supabase.from("events").delete().eq('id', event.id);
      return { error: createError.message };
    }

    return { eventId: event.id };
  } catch (error) {
    recentImports.delete(importKey); // Clean up on error
    return { error: "Failed to fetch or process round data" };
  }
};

export const purchaseCredits = async (amount: number) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      `/credits`,
      "You must be signed in to purchase credits"
    );
  }

  // Get current event participant
  const { data: eventParticipant, error: participantError } = await supabase
    .from("event_participants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (participantError || !eventParticipant) {
    return encodedRedirect(
      "error",
      `/credits`,
      "You are not a participant in any event"
    );
  }

  // Update available votes
  const { error: updateError } = await supabase
    .from("event_participants")
    .update({ available_votes: eventParticipant.available_votes + amount })
    .eq("id", eventParticipant.id);

  if (updateError) {
    return encodedRedirect(
      "error",
      `/credits`,
      "Failed to update available votes"
    );
  }

  return encodedRedirect(
    "success",
    `/credits`,
    `Successfully purchased ${amount} credit${amount === 1 ? "" : "s"}`
  );
};
