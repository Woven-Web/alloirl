import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UsernameForm from "./components/UsernameForm";
import { AlloLogo } from "@/components/allo-logo";
import Link from "next/link";

export default async function UsernamePage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?message=Please sign in first&type=error");
  }

  // Check if name already requested
  const { data: profile } = await supabase
    .from('profiles')
    .select('name_requested')
    .eq('id', user.id)
    .single();

  // Mark name as requested as soon as they see this page
  await supabase
    .from('profiles')
    .update({ name_requested: true })
    .eq('id', user.id);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full space-y-8">
        <h1 className="font-eyebrow text-2xl text-brand-blue text-center">Choose Your Name</h1>
        <div className="flex flex-col gap-4 text-center font-eyebrow text-sm text-brand-blue">
          <p>
            Your name will be posted to Ethereum Attestation Service and shown on the dashboard during live events.
          </p>
          <p>
            If you do not wish to set a username, a random name will be generated for you.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <UsernameForm />
        </div>
      </div>
    </div>
  );
} 