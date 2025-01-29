'use server';

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/serverAdmin";

const encodedRedirect = (type: "success" | "error", path: string, message: string) =>
  redirect(`${path}?message=${encodeURIComponent(message)}&type=${type}`);

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required"
    );
  }

  const adminClient = await createAdminClient();

  // Check if email is in allowlist for any current/upcoming event
  const { data: allowlistRecord, error: allowlistError } = await adminClient
    .from("event_allowlist")
    .select("id, event_id")
    .eq("email", email)
    .eq("has_registered", false)
    .single();

  if (allowlistError || !allowlistRecord) {
    return encodedRedirect(
      "error", 
      "/sign-up", 
      "Email is not allowed or already registered"
    );
  }

  const headersList = await headers();
  const origin = headersList.get("origin");

  // Create the user account with regular client since it needs to trigger email verification
  const supabase = await createClient();
  const { error: signupError, data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (signupError) {
    console.error(signupError.code + " " + signupError.message);
    return encodedRedirect("error", "/sign-up", signupError.message);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    return encodedRedirect("error", "/sign-up", "Failed to create user");
  }

  try {
    // Create event participant record
    const { error: participantError } = await adminClient
      .from("event_participants")
      .insert({
        event_id: allowlistRecord.event_id,
        user_id: userId
      });

    if (participantError) throw participantError;

    // Record initial credit transaction
    const { error: transactionError } = await adminClient
      .from("transactions")
      .insert({
        user_id: userId,
        amount: 10,
        type: 'credit_grant'
      });

    if (transactionError) throw transactionError;

    // Mark email as registered in allowlist
    const { error: updateError } = await adminClient
      .from("event_allowlist")
      .update({ has_registered: true })
      .eq("id", allowlistRecord.id);

    if (updateError) throw updateError;

  } catch (error) {
    console.error("Failed to create user records:", error);
    // Even if some records fail to create, the user can still verify their email
    // and we can fix the missing records later if needed
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link."
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/login", "Invalid login credentials");
  }

  return redirect("/");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
};

export const resetPasswordAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/protected/reset-password`,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password"
    );
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const updatePasswordAction = async (formData: FormData) => {
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;

  if (!password || !passwordConfirm) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required"
    );
  }

  if (password !== passwordConfirm) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match"
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed"
    );
  }

  return redirect("/");
};
