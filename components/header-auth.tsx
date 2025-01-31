'use client';

import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface EventParticipant {
  id: string;
  user_id: string;
  event_id: string;
  available_votes: number;
  events?: {
    id: string;
    name: string;
  };
}

export default function HeaderAuth() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const projectId = params?.projectId as string;
  const [user, setUser] = useState<any>(null);
  const [eventParticipant, setEventParticipant] = useState<EventParticipant | null>(null);
  const [availableVotes, setAvailableVotes] = useState<number | null>(null);

  const fetchEventParticipant = async (userId: string) => {
    console.log('header-auth fetchEventParticipant');
    const supabase = createClient();
    const { data: eventParticipantData } = await supabase
      .from('event_participants')
      .select(`
        *,
        events(
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();
    
    setEventParticipant(eventParticipantData);
    if (eventParticipantData) {
      setAvailableVotes(eventParticipantData.available_votes);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user && eventId) {
        await fetchEventParticipant(user.id);

        // Set up real-time subscription
        const channel = supabase
          .channel('participants_header')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'event_participants',
            filter: `user_id=eq.${user.id}`
          }, () => fetchEventParticipant(user.id))
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      }
    };

    fetchData();
  }, [eventId]);

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
