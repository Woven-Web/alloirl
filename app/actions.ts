"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/serverAdmin";
import { createVoteAllocationAttestation } from "@/utils/eas";

const encodedRedirect = (
  type: "success" | "error",
  path: string,
  message: string,
  additionalParams?: Record<string, string | boolean | number>,
) => {
  const params = new URLSearchParams({
    message: message,
    type: type,
    ...(additionalParams || {}),
  });
  return redirect(`${path}?${params.toString()}`);
};

const recentImports = new Map<string, number>();
const IMPORT_COOLDOWN = 5000; // 5 seconds

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  const supabase = await createClient();

  if (code && email) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      return encodedRedirect("error", "/sign-in", error.message, { email });
    }

    console.log("OTP verified successfully for email:", email);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("Auth getUser result:", { user, error: userError });

    if (!user || userError) {
      console.error("Failed to get user after OTP verification:", userError);
      return encodedRedirect("error", "/sign-in", "Authentication failed");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id || "")
      .single();

    console.log("Profile query result:", { profile, error: profileError });

    // Create profile if it doesn't exist
    if (!profile && user) {
      // Use admin client for allowlist operations
      const adminClient = await createAdminClient();
      
      // Check if user is on any event allowlist
      const { data: allowlistEntry, error: allowlistError } = await adminClient
        .from("event_allowlist")
        .select("*")
        .eq("email", user.email?.toLowerCase())
        .eq("has_registered", false)
        .single();

      console.log("Allowlist check for new user:", { allowlistEntry, error: allowlistError });

      // Create the profile
      const { error: createError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            email: user.email,
            name_requested: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (createError) {
        console.error("Error creating profile:", createError);
        return encodedRedirect("error", "/sign-in", "Failed to create profile");
      }

      // If user was on allowlist, create event_participants entry and update allowlist
      if (allowlistEntry?.event_id) {
        console.log("Creating event participant for event:", allowlistEntry.event_id);
        
        // Create event participant with default 10 votes
        const { error: participantError } = await adminClient
          .from("event_participants")
          .insert([
            {
              user_id: user.id,
              event_id: allowlistEntry.event_id,
              available_votes: 100,
              is_admin: false,
            },
          ]);

        if (participantError) {
          console.error("Error creating event participant:", participantError);
        } else {
          console.log("Event participant created successfully");
        }

        // Mark allowlist entry as registered
        const { error: allowlistUpdateError } = await adminClient
          .from("event_allowlist")
          .update({ has_registered: true })
          .eq("email", user.email)
          .eq("event_id", allowlistEntry.event_id);

        if (allowlistUpdateError) {
          console.error("Error updating allowlist:", allowlistUpdateError);
        } else {
          console.log("Allowlist entry updated successfully");
        }
      }

      return { refresh: true, url: '/username' };
    }

    if (!profile?.name) {
      return { refresh: true, url: '/username' };
    }

    // TODO: make this dynamic
    return { refresh: true, url: '/events/a6dbab6b-a108-4147-ab09-0cdf0d802edb' };
  }

  if (!email) {
    return encodedRedirect("error", "/sign-in", "Email is required");
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Supabase OTP error:", error);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Check your email for your OTP code.",
    { otpSent: 1, email },
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
  amount: number,
  reaction?: string,
) => {
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to vote");
  }

  console.log("Checking participation for:", { userId: user.id, eventId });

  // Use admin client to bypass RLS and check if user is actually a participant
  const { data: eventParticipant, error: participantError } = await adminClient
    .from("event_participants")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  console.log("Admin participant query:", { eventParticipant, participantError });

  if (participantError || !eventParticipant) {
    console.error("Participation check failed:", { participantError, eventParticipant });
    throw new Error("You are not a participant in this event");
  }

  // Get current event participant and their profile
  const [
    { data: profile },
    { data: project }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single()
  ]);

  if (!profile?.name) {
    throw new Error("Profile name not found");
  }

  if (!project?.name) {
    throw new Error("Project not found");
  }

  // Get current allocation if it exists
  const { data: currentAllocation } = await supabase
    .from("project_allocations")
    .select("*")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("event_id", eventId)
    .single();

  // Calculate the vote difference
  const currentVotes = currentAllocation?.votes || 0;
  const voteDifference = amount - currentVotes;

  // Check if they have enough votes
  if (eventParticipant.available_votes < voteDifference) {
    throw new Error("You don't have enough votes");
  }

  // Begin transaction
  const { error: transactionError } = await supabase.rpc('allocate_votes', {
    p_event_id: eventId,
    p_project_id: projectId,
    p_amount: amount,
    p_reaction: reaction,
  });

  if (transactionError) {
    throw new Error("Failed to allocate votes: " + transactionError.message);
  }

  try {
    // Create EAS attestation asynchronously
    const { transactionHash, status, error } = await createVoteAllocationAttestation({
      eventId,
      projectId,
      projectTitle: project.name,
      amount,
      voterId: user.id,
      username: profile.name,
    });

    // Get the most recent transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("event_id", eventId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (transaction) {
      // Update with the transaction hash and status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ 
          transaction_hash: transactionHash,
          attestation_status: status,
          attestation_error: error
        })
        .eq("id", transaction.id);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
      }
    }

    if (error) {
      console.warn("Attestation created with error:", error);
      return {
        success: true,
        message: `Allocated ${amount} vote${amount === 1 ? "" : "s"}, but there was an issue with the attestation: ${error}`,
        transactionHash,
        status,
      };
    }

    return {
      success: true,
      message: `Successfully allocated ${amount} vote${amount === 1 ? "" : "s"}`,
      transactionHash,
      status,
    };
  } catch (error) {
    console.error("Failed to create attestation:", error);
    // Note: We don't throw here because the vote allocation was successful
    // The attestation is a nice-to-have but not critical for the user experience
    return {
      success: true,
      message: `Successfully allocated ${amount} vote${amount === 1 ? "" : "s"}, but attestation failed`,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
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
      },
    );

    const data = await response.json();
    if (data.errors) {
      return { error: data.errors[0].message };
    }

    const round = data.data.round;
    const metadata =
      typeof round.roundMetadata === "string"
        ? JSON.parse(round.roundMetadata)
        : round.roundMetadata;

    // Add logging to debug the round ID we're checking
    console.log("Checking for existing event with gitcoin_round_id:", round.id);

    // Check if event already exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from("events")
      .select("id, gitcoin_round_id")
      .eq("gitcoin_round_id", round.id)
      .maybeSingle();

    // Add logging to see what we found
    console.log("Existing event check result:", { existingEvent, fetchError });

    if (fetchError) {
      return {
        error: `Error checking for existing event: ${fetchError.message}`,
      };
    }

    if (existingEvent) {
      return {
        error: `This round has already been imported (Event ID: ${existingEvent.id})`,
      };
    }

    // Create event and projects in a single transaction
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        name: metadata.name || `Gitcoin Round ${roundId}`,
        description: metadata.eligibility?.description || "",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        gitcoin_round_id: round.id,
      })
      .select()
      .single();

    if (eventError) {
      return { error: eventError.message };
    }

    if (!round.applications || !Array.isArray(round.applications)) {
      return { error: "No applications found in round data" };
    }

    const projects = round.applications
      .map((application: any) => {
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
      })
      .filter((p: unknown) => p !== null);

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
      await supabase.from("events").delete().eq("id", event.id);
      return { error: createError.message };
    }

    return { eventId: event.id };
  } catch (error) {
    recentImports.delete(importKey); // Clean up on error
    return { error: "Failed to fetch or process round data" };
  }
};

export const updateProfileName = async (formData: FormData) => {
  const name = formData.get("name") as string;

  if (!name) {
    return encodedRedirect("error", "/profile/edit", "Name is required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/profile/edit", "You must be signed in");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", user.id);

  if (error) {
    return encodedRedirect(
      "error",
      "/profile/edit",
      "Failed to update profile",
    );
  }

  return { refresh: true, url: '/profile' };
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
      "You must be signed in to purchase credits",
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
      "You are not a participant in any event",
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
      "Failed to update available votes",
    );
  }

  return encodedRedirect(
    "success",
    `/credits`,
    `Successfully purchased ${amount} credit${amount === 1 ? "" : "s"}`,
  );
};

export const updateUsername = async (formData: FormData) => {
  const name = formData.get("name") as string;

  if (!name) {
    return { error: "Name is required" };
  }

  if (name.length < 2) {
    return { error: "Name must be at least 2 characters long" };
  }

  if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
    return { error: "Name can only contain letters, numbers, spaces, underscores and dashes" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ name: name.trim() })
    .eq("id", user.id);

  if (updateError) {
    // Check for unique constraint violation
    if (updateError.code === '23505') {
      return { error: `The name "${name}" is already taken. Please choose another.` };
    }
    return { error: updateError.message };
  }

  return { refresh: true, url: '/events/a6dbab6b-a108-4147-ab09-0cdf0d802edb' };
};
