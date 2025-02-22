"use client";

import { PrimaryButton } from "@/components/ui/primary-button";
import { NumberInput } from "@/components/ui/number-input";
import { useState, useEffect } from "react";
import { allocateVotes } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";
import toast from 'react-hot-toast';
import Link from "next/link";
// import { useToast } from "@/components/ui/use-toast";

const EMOJI_OPTIONS = ['❤️', '🎉', '🚀', '💡', '🌱', '🐸', '🗿'] as const;
type EmojiOption = typeof EMOJI_OPTIONS[number];

interface EventParticipant {
  id: string;
  user_id: string;
  event_id: string;
  available_votes: number;
  events?: {
    id: string;
    name: string;
    vote_limit: number;
  };
}

interface VoteAllocationProps {
  eventId: string;
  projectId: string;
  participantData: EventParticipant | null;
  currentAllocation: number;
  totalVotes: number;
  onVoteSuccess?: () => void;
}

export function VoteAllocation({
  eventId,
  projectId,
  participantData,
  currentAllocation,
  totalVotes,
  onVoteSuccess,
}: VoteAllocationProps) {
  const [allocatingVotes, setAllocatingVotes] = useState(currentAllocation || 0);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localParticipantData, setLocalParticipantData] = useState(participantData);
  const [localCurrentAllocation, setLocalCurrentAllocation] = useState(currentAllocation);
  const supabase = createClient();

  // Update local state when props change
  useEffect(() => {
    setLocalParticipantData(participantData);
  }, [participantData]);

  useEffect(() => {
    setLocalCurrentAllocation(currentAllocation);
    setAllocatingVotes(currentAllocation);
  }, [currentAllocation]);

  useEffect(() => {
    // Listen for participant changes
    const participantChannel = supabase
      .channel('participants_vote_allocation')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_participants',
        filter: `id=eq.${participantData?.id}` 
      }, async (payload) => {
        // Fetch full participant data including events
        const { data: fullParticipant } = await supabase
          .from('event_participants')
          .select(`
            *,
            events (
              id,
              name,
              vote_limit
            )
          `)
          // @ts-ignore
          .eq('id', payload.new.id)
          .single();
        
        console.log('Participant update:', { 
          fullParticipant,
          voteLimit: fullParticipant?.events?.vote_limit
        });
        
        setLocalParticipantData(fullParticipant);
      })
      .subscribe();

    // Listen for allocation changes
    const allocationChannel = supabase
      .channel('project_allocations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_allocations',
        filter: `project_id=eq.${projectId} and user_id=eq.${participantData?.user_id}`,
      }, async (payload) => {
        console.log('Allocation update:', {
          newAllocation: payload.new,
          currentVoteLimit: localParticipantData?.events?.vote_limit
        });
        
        // Use the payload data directly instead of making another request
        if (payload.new) {
          const newVotes = (payload.new as any).votes || 0;
          setLocalCurrentAllocation(newVotes);
          setAllocatingVotes(newVotes);
        } else {
          // If the record was deleted, set to 0
          setLocalCurrentAllocation(0);
          setAllocatingVotes(0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(allocationChannel);
    };
  }, [participantData?.id, projectId, participantData?.user_id]);

  // Get available votes and vote limit
  const availableVotes = localParticipantData?.available_votes || 0;
  const voteLimit = localParticipantData?.events?.vote_limit || 60; // Default to 60 if not set

  // Debug current state
  useEffect(() => {
    console.log('State update:', {
      availableVotes,
      voteLimit,
      localCurrentAllocation,
      participantData: localParticipantData
    });
  }, [availableVotes, voteLimit, localCurrentAllocation, localParticipantData]);

  const submitAllocation = async () => {
    try {
      setIsSubmitting(true);
      const result = await allocateVotes(projectId, eventId, allocatingVotes, selectedEmoji || undefined);
      if (result.success) {
        toast.success(result.message);
        window.location.reload();
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
          <div className="flex flex-col items-end w-full">
            <span className="text-brand-blue font-eyebrow text-sm right-0">
              {availableVotes} available
            </span>
            {/* <span className="text-brand-blue/60 font-eyebrow text-xs">
              {localCurrentAllocation} currently allocated
            </span> */}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-2">
              <NumberInput
                min={0}
                max={availableVotes + localCurrentAllocation}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setAllocatingVotes(value);
                }}
                value={allocatingVotes}
                className="flex-1"
              />
              <span className="text-brand-blue font-eyebrow text-sm whitespace-nowrap">
                / {voteLimit}
              </span>
            </div>
            <PrimaryButton 
              onClick={submitAllocation} 
              disabled={
                isSubmitting || 
                allocatingVotes === localCurrentAllocation ||
                allocatingVotes > (availableVotes + localCurrentAllocation)
              }
            >
              {isSubmitting ? "Allocating..." : "Allocate"}
            </PrimaryButton>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-brand-blue font-eyebrow text-sm">Choose a reaction (optional)</span>
            <div className="flex gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji === selectedEmoji ? null : emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    emoji === selectedEmoji 
                      ? 'bg-brand-blue/10 scale-110' 
                      : 'hover:bg-brand-blue/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
