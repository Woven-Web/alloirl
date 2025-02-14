import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreditSelection } from "./components/CreditSelection";
import { Message } from "../../components/Message";

export default async function TopUpPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; type?: 'success' | 'error' }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?message=Please sign in to purchase credits&type=error");
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <div className="flex flex-col gap-6">
        {params?.message && (
          <Message message={params.message} type={params.type || 'error'} />
        )}
        
        <h1 className="text-2xl font-bold text-center">Purchase Credits</h1>
        <p className="text-center">
          Each credit costs $1 and can be used to vote on projects
        </p>
        <CreditSelection />
      </div>
    </div>
  );
}
