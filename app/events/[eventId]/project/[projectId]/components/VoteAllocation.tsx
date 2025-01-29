"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { allocateVotes } from "@/app/actions";
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
  participantData: EventParticipant | null;
  projectId: string;
  eventId: string;
}

export function VoteAllocation({
  participantData,
  projectId,
  eventId,
}: VoteAllocationProps) {
  const [allocatingVotes, setAllocatingVotes] = useState(
    participantData?.available_votes ? Math.round(participantData.available_votes / 2) : 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const { toast } = useToast();

  const submitAllocation = async () => {
    try {
      setIsSubmitting(true);
      await allocateVotes(projectId, eventId, allocatingVotes);
      // toast({
      //   title: "Votes allocated successfully",
      //   variant: "default",
      // });
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
      <p>Available: {participantData?.available_votes}</p>
      <div className="flex items-center space-x-2">
        <Input 
          type="number"
          min={0}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 0) {
              setAllocatingVotes(value);
            }
          }}
          value={allocatingVotes}
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
