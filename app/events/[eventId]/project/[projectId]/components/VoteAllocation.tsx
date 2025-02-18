"use client";

import { PrimaryButton } from "@/components/ui/primary-button";
import { NumberInput } from "@/components/ui/number-input";
import { useState, useEffect } from "react";
import { allocateVotes } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";
import toast from 'react-hot-toast';
import Link from "next/link";
// import { useToast } from "@/components/ui/use-toast";

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
  const [recentAllocations, setRecentAllocations] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('participants_vote_allocation')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_participants',
        filter: `id=eq.${participantData?.id}` 
      }, (payload) => {
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
      const result = await allocateVotes(projectId, eventId, allocatingVotes);
      if (result.success) {
        toast.success(result.message);
        if (onVoteSuccess) {
          onVoteSuccess();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to allocate votes");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 space-y-4 overflow-auto">
        {/* <h2 className="text-brand-blue font-eyebrow text-4xl">Recent Allocations</h2>
        <div className="space-y-2">
          {recentAllocations.map((allocation) => (
            <div key={allocation.id} className="text-brand-blue font-eyebrow text-lg">
              {allocation.time} | {allocation.user} | {allocation.votes}
            </div>
          ))}
        </div> */}
      </div>

      <div className="mt-8 pb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-brand-blue font-eyebrow text-lg">allocate</span>
          <span className="text-brand-blue font-eyebrow text-sm">{localParticipantData?.available_votes ?? 0} available</span>
        </div>
        <div className="flex gap-4">
          <NumberInput
            min={0}
            max={localParticipantData?.available_votes ?? 0}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : parseInt(e.target.value);
              if (!isNaN(value) && value >= 0) {
                setAllocatingVotes(value);
              }
            }}
            value={allocatingVotes || ''}
          />
          <PrimaryButton 
            onClick={submitAllocation} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Allocating..." : "Allocate"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
