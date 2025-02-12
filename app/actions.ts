'use server';

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const encodedRedirect = (type: "success" | "error", path: string, message: string) =>
  redirect(`${path}?message=${encodeURIComponent(message)}&type=${type}`);

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;

  if (!email) {
    return encodedRedirect(
      "error",
      "/sign-in",
      "Email is required"
    );
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
    return encodedRedirect(
      "error",
      "/sign-in",
      error.message
    );
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

export const allocateVotes = async (projectId: string, eventId: string, amount: number) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
  const { error: voteError } = await supabase
    .from("votes")
    .insert({
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
    `Successfully allocated ${amount} vote${amount === 1 ? '' : 's'}`
  );
};

export const purchaseCredits = async (amount: number) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    `Successfully purchased ${amount} credit${amount === 1 ? '' : 's'}`
  );
};
