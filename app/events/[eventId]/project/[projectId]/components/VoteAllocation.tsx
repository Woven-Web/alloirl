"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { allocateVotes } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";
// import { useToast } from "@/components/ui/use-toast";

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

interface VoteAllocationProps {
  eventId: string;
  projectId: string;
  participantData: EventParticipant | null;
  onVoteSuccess?: () => void;
}

export function VoteAllocation({
  eventId,
  projectId,
  participantData,
  onVoteSuccess,
}: VoteAllocationProps) {
  const [allocatingVotes, setAllocatingVotes] = useState(
    participantData?.available_votes ? Math.round(participantData.available_votes / 2) : 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localParticipantData, setLocalParticipantData] = useState(participantData);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('participants')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_participants',
        filter: `id=eq.${participantData?.id}` 
      }, (payload) => {
        console.log('VoteAllocationpayload', payload);
        setLocalParticipantData(payload.new as EventParticipant);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participantData?.id]);

  const submitAllocation = async () => {
    try {
      setIsSubmitting(true);
      await allocateVotes(projectId, eventId, allocatingVotes);
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      // toast({
      //   title: "Failed to allocate votes",
      //   description: error instanceof Error ? error.message : "Unknown error occurred",
      //   variant: "destructive",
      // });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 flex flex-col space-y-2">
      <h3 className="text-lg font-semibold mb-2">Allocate Votes</h3>
      <p>Available: {localParticipantData?.available_votes}</p>
      <div className="flex items-center space-x-2">
        <Input 
          type="number"
          min={0}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
            if (!isNaN(value) && value >= 0) {
              setAllocatingVotes(value);
            }
          }}
          value={allocatingVotes || ''}
        />
        <Button 
          onClick={submitAllocation} 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Allocating..." : "Allocate"}
        </Button>
      </div>
    </div>
  );
}
