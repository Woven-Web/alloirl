'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface ActiveEvent {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  name: string;
  votes_active: boolean;
}

interface EventParticipation {
  events: EventData | EventData[] | null;
}

export function LoggedInCallout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchEvent = async () => {
      const supabase = createClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Fetch latest active event the user is participating in
      const { data: eventParticipation } = await supabase
        .from('event_participants')
        .select(`
          events (
            id,
            name,
            votes_active
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Find the first event with votes_active = true
      const activeParticipation = eventParticipation?.find(
        (participation: EventParticipation) => {
          if (!participation.events) return false;
          
          const eventData = Array.isArray(participation.events) 
            ? participation.events[0] 
            : participation.events;
            
          return eventData && eventData.votes_active === true;
        }
      );
      
      if (activeParticipation && activeParticipation.events) {
        const eventData = Array.isArray(activeParticipation.events) 
          ? activeParticipation.events[0] 
          : activeParticipation.events;
          
        setActiveEvent({
          id: eventData.id,
          name: eventData.name
        });
      }
      
      setIsLoading(false);
    };
    
    checkAuthAndFetchEvent();
  }, []);

  if (!isLoggedIn || isLoading) {
    return null;
  }

  if (!activeEvent) {
    return (
      <div className="relative mb-8 p-4 bg-gradient-to-r from-brand-blue/10 to-brand-yellow/10 rounded-xl border-2 border-brand-blue/20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ animation: 'sheen 3s ease-in-out infinite' }}
        />
        <div className="relative font-eyebrow text-lg text-brand-blue">
          You're not participating in any active rounds. 
          <div className="mt-2 text-base">
            Talk to an event organizer to get added or <Link href="/profile" className="underline hover:opacity-80">view your past rounds on your profile</Link>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-8 p-4 bg-gradient-to-r from-brand-blue/10 to-brand-yellow/10 rounded-xl border-2 border-brand-blue/20 overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ animation: 'sheen 3s ease-in-out infinite' }}
      />
      <Link 
        href={`/events/${activeEvent.id}`}
        className="relative font-eyebrow text-lg text-brand-blue hover:opacity-80 transition-opacity"
      >
        👉 Click here to see {activeEvent.name}
      </Link>
    </div>
  );
}

// Add this to your globals.css file
const styles = `
@keyframes sheen {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}
`; 