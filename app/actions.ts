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

// Helper function to handle allowlist checking and event registration
async function handleAllowlistAndRegistration(user: any) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  
  console.log("Checking allowlist for user with email:", user.email?.toLowerCase());
  
  // First, check all allowlist entries for this email
  const { data: allAllowlistEntries, error: allAllowlistError } = await adminClient
    .from("event_allowlist")
    .select("*")
    .eq("email", user.email?.toLowerCase());
  
  console.log("All allowlist entries for this email:", { 
    entries: allAllowlistEntries, 
    error: allAllowlistError,
    count: allAllowlistEntries?.length || 0
  });
  
  // Check if any of the allowlist entries are already registered
  const registeredEntries = allAllowlistEntries?.filter(entry => entry.has_registered);
  if (registeredEntries && registeredEntries.length > 0) {
    console.log("User has already registered for some events:", registeredEntries);
  }
  
  // Check for unregistered entries
  const { data: unregisteredEntries, error: allowlistError } = await adminClient
    .from("event_allowlist")
    .select("*")
    .eq("email", user.email?.toLowerCase())
    .eq("has_registered", false);

  console.log("Unregistered allowlist entries check result:", { 
    entries: unregisteredEntries, 
    count: unregisteredEntries?.length || 0,
    error: allowlistError
  });

  // Process the most recent unregistered entry if available
  const allowlistEntry = unregisteredEntries && unregisteredEntries.length > 0 
    ? unregisteredEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
    : null;
  
  if (allowlistEntry) {
    console.log("Selected most recent unregistered allowlist entry:", {
      id: allowlistEntry.id,
      event_id: allowlistEntry.event_id,
      created_at: allowlistEntry.created_at
    });
  }

  if (allowlistEntry?.event_id) {
    console.log("User on allowlist for event:", allowlistEntry.event_id);
    
    // Check if they already have a participant record for this event
    const { data: existingParticipant, error: participantCheckError } = await supabase
      .from("event_participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", allowlistEntry.event_id)
      .single();
    
    console.log("Existing participant check:", {
      existingParticipant,
      error: participantCheckError,
      errorCode: participantCheckError?.code
    });
    
    // Only create a new participant record if one doesn't exist
    if (!existingParticipant && participantCheckError?.code === 'PGRST116') { // PGRST116 is "not found"
      // Create event participant with default 100 votes
      const { error: participantError } = await adminClient
        .from("event_participants")
        .insert([
          {
            user_id: user.id,
            event_id: allowlistEntry.event_id,
            available_votes: 100,
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
        .eq("email", user.email?.toLowerCase())
        .eq("event_id", allowlistEntry.event_id);

      if (allowlistUpdateError) {
        console.error("Error updating allowlist:", allowlistUpdateError);
      } else {
        console.log("Allowlist entry updated successfully");
      }
      
      // Return the event ID for redirection
      return { newRegistration: true, eventId: allowlistEntry.event_id, allowlistUpdated: true };
    } else if (existingParticipant) {
      // If they already have a participant record but the allowlist entry is not marked as registered,
      // update the allowlist entry
      console.log("User already has a participant record for this event, updating allowlist entry");
      
      const { error: allowlistUpdateError } = await adminClient
        .from("event_allowlist")
        .update({ has_registered: true })
        .eq("email", user.email?.toLowerCase())
        .eq("event_id", allowlistEntry.event_id);

      if (allowlistUpdateError) {
        console.error("Error updating allowlist:", allowlistUpdateError);
      } else {
        console.log("Allowlist entry updated successfully");
      }
      
      return { newRegistration: false, eventId: allowlistEntry.event_id, allowlistUpdated: true };
    } else {
      // In any other case, still mark the allowlist entry as registered
      console.log("Updating allowlist entry as registered");
      
      const { error: allowlistUpdateError } = await adminClient
        .from("event_allowlist")
        .update({ has_registered: true })
        .eq("email", user.email?.toLowerCase())
        .eq("event_id", allowlistEntry.event_id);

      if (allowlistUpdateError) {
        console.error("Error updating allowlist:", allowlistUpdateError);
      } else {
        console.log("Allowlist entry updated successfully");
      }
      
      return { newRegistration: false, eventId: allowlistEntry.event_id, allowlistUpdated: true };
    }
  }

  // Get all events the user is participating in
  const { data: participations, error: participationsError } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  console.log("User event participations:", {
    participations,
    error: participationsError,
    count: participations?.length || 0
  });
  
  // If user has event participations, return the most recent one
  if (participations && participations.length > 0) {
    console.log("Found most recent event participation:", participations[0].event_id);
    return { newRegistration: false, eventId: participations[0].event_id, allowlistUpdated: false };
  }

  // No events found
  console.log("No event participations found");
  return { newRegistration: false, eventId: null, allowlistUpdated: false };
}

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

      // Check allowlist and handle registration
      // This will mark any allowlist entries as registered=true even if we redirect to username page
      const result = await handleAllowlistAndRegistration(user);
      
      // Always redirect to username page first for new users
      return { refresh: true, url: '/username' };
    }

    // If profile exists but doesn't have a name, redirect to username page
    if (!profile?.name) {
      return { refresh: true, url: '/username' };
    }

    // Check allowlist and handle registration for existing users
    const result = await handleAllowlistAndRegistration(user);
    
    // Use returnTo URL if provided
    const returnTo = formData.get("returnTo") as string;
    if (returnTo) {
      return { refresh: true, url: decodeURIComponent(returnTo) };
    }
    
    // If we just registered for a new event, redirect to it
    if (result.newRegistration && result.eventId) {
      return { refresh: true, url: `/events/${result.eventId}` };
    }
    
    // If user has event participations, redirect to their most recent event
    if (result.eventId) {
      return { refresh: true, url: `/events/${result.eventId}` };
    }

    // Fallback to homepage if no events found
    return { refresh: true, url: '/' };
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

  // Preserve returnTo parameter when redirecting back for OTP
  const returnTo = formData.get("returnTo") as string;
  const additionalParams: Record<string, string | boolean | number> = {
    otpSent: 1,
    email,
  };
  if (returnTo) {
    additionalParams.returnTo = returnTo;
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Check your email for your OTP code.",
    additionalParams
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to vote");
  }

  // Check if voting is active for this event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("votes_active")
    .eq("id", eventId)
    .single();

  if (eventError) {
    console.error("Failed to fetch event:", eventError);
    throw new Error("Failed to check if voting is active");
  }

  if (!event.votes_active) {
    throw new Error("Voting is not currently active for this event");
  }

  // Get project and profile info for attestation
  const [
    { data: profile, error: profileError },
    { data: project, error: projectError }
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

  if (profileError || !profile?.name) {
    throw new Error("Profile not found");
  }

  if (projectError || !project?.name) {
    throw new Error("Project not found");
  }

  // Call the Supabase function to handle the transaction
  const { data, error: transactionError } = await supabase.rpc('allocate_votes_2', {
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
      await supabase
        .from("transactions")
        .update({ 
          transaction_hash: transactionHash,
          attestation_status: status,
          attestation_error: error
        })
        .eq("id", transaction.id);
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

  console.log("Username updated successfully for user:", user.id);

  // Check allowlist and handle registration
  // This will mark any allowlist entries as registered=true and create event participants if needed
  const result = await handleAllowlistAndRegistration(user);
  
  // If we just registered for a new event, redirect to it
  if (result.newRegistration && result.eventId) {
    return { refresh: true, url: `/events/${result.eventId}` };
  }
  
  // If user has event participations, redirect to their most recent event
  if (result.eventId) {
    return { refresh: true, url: `/events/${result.eventId}` };
  }

  // Fallback to homepage if no events found
  return { refresh: true, url: '/' };
};

export const bulkAddToAllowlist = async (eventId: string, emails: string[]) => {
  try {
    // Input validation
    if (!eventId) return { error: "Event ID is required" };
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return { error: "No valid emails provided" };
    }

    // Create clients for database operations
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    
    // Check authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "You must be logged in to perform this action" };
    }
    
    // Check if user is a super admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", user.id)
      .single();
      
    if (profileError) {
      console.error("Error checking admin status:", profileError);
      return { error: "Failed to verify admin permissions" };
    }
    
    let isAuthorized = profile?.admin === true;
    
    // If not a super admin, check if they're an event admin for this event
    if (!isAuthorized) {
      const { data: eventParticipant, error: participantError } = await supabase
        .from("event_participants")
        .select("admin")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .single();
        
      if (participantError && participantError.code !== 'PGRST116') {
        console.error("Error checking event admin status:", participantError);
        return { error: "Failed to verify event admin permissions" };
      }
      
      isAuthorized = eventParticipant?.admin === true;
    }
    
    // Return error if not authorized
    if (!isAuthorized) {
      return { error: "You must be an admin or event admin to add emails to the allowlist" };
    }
    
    // Normalize and validate emails
    const validEmails = emails
      .map(email => email.trim().toLowerCase())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (validEmails.length === 0) {
      return { error: "No valid emails found" };
    }

    // Check which emails already exist in the allowlist for this event
    const { data: existingEntries, error: checkError } = await adminClient
      .from("event_allowlist")
      .select("email")
      .eq("event_id", eventId)
      .in("email", validEmails);
    
    if (checkError) {
      console.error("Error checking existing allowlist entries:", checkError);
      return { error: "Failed to check existing entries" };
    }

    // Create a set of existing emails for quick lookup
    const existingEmails = new Set(existingEntries?.map(entry => entry.email.toLowerCase()) || []);
    
    // Filter out emails that already exist
    const newEmails = validEmails.filter(email => !existingEmails.has(email));
    
    // Prepare results object
    const results = {
      total: validEmails.length,
      added: 0,
      skipped: existingEmails.size,
      error: null
    };
    
    // If there are new emails to add, insert them in a single operation
    if (newEmails.length > 0) {
      // Prepare the data for bulk insert
      const entriesToInsert = newEmails.map(email => ({
        email,
        event_id: eventId,
        has_registered: false
      }));
      
      // Perform the bulk insert
      const { data, error: insertError } = await adminClient
        .from("event_allowlist")
        .insert(entriesToInsert)
        .select("id");
      
      if (insertError) {
        // If the error is about the has_registered column not existing, try without it
        if (insertError.message?.includes('has_registered') || 
            insertError.details?.includes('has_registered')) {
          
          console.log("has_registered column may not exist, trying without it");
          
          // Try again without the has_registered field
          const basicEntries = newEmails.map(email => ({
            email,
            event_id: eventId
          }));
          
          const { data: basicData, error: basicError } = await adminClient
            .from("event_allowlist")
            .insert(basicEntries)
            .select("id");
          
          if (basicError) {
            console.error("Error adding emails to allowlist:", basicError);
            return { 
              ...results, 
              error: "Failed to add emails to allowlist", 
              errorDetails: basicError 
            };
          }
          
          results.added = basicData?.length || 0;
        } else {
          console.error("Error adding emails to allowlist:", insertError);
          return { 
            ...results, 
            error: "Failed to add emails to allowlist", 
            errorDetails: insertError 
          };
        }
      } else {
        results.added = data?.length || 0;
      }
    }
    
    return results;
  } catch (err) {
    console.error("Unexpected error in bulkAddToAllowlist:", err);
    return { error: "An unexpected error occurred" };
  }
};
