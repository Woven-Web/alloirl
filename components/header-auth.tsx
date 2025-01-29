import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/server";

interface EventParticipant {
  id: string;
  user_id: string;
  event_id: string;
  available_votes: number;
  events_public?: {
    id: string;
    name: string;
  };
}

export default async function AuthButton({
  eventId,
  projectId
}: {
  eventId?: string;
  projectId?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let availableVotes: number | null = null;
  
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    profile = profileData;

    if (eventId) {
      const { data: eventParticipantData } = await supabase
        .from('event_participants')
        .select(`
          *,
          events_public (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .single() as { data: EventParticipant };

        availableVotes = eventParticipantData.available_votes;
    }
}

  if (!hasEnvVars) {
    return (
      <>
        <div className="flex gap-4 items-center">
          <div>
            <Badge
              variant={"default"}
              className="font-normal pointer-events-none"
            >
              Please update .env.local file with anon key and url
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={"outline"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={"default"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span>{user.email}</span>
        {availableVotes && <span className="text-sm text-muted-foreground">({availableVotes} votes)</span>}
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant={"outline"}>
          Sign out
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
