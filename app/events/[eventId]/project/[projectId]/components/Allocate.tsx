'use client';

import { useState } from 'react';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import { createClient } from '@/utils/supabase/client';

interface AllocationProps {
  project: Project;
  user: User;
  onAllocate: (votes: number) => Promise<void>;
}

export function Allocate({ project, user, onAllocate }: AllocationProps) {
  const [votes, setVotes] = useState('10');
  const totalProjectVotes = project.total_votes || 0;

  const handleAllocate = async () => {
    if (!votes || isNaN(Number(votes))) return;
    const voteCount = Number(votes);
    if (voteCount > user.available_votes) return;
    await onAllocate(voteCount);
    setVotes('10');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">RegenHub</h2>
            <div className="text-green-400">+{totalProjectVotes} votes</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-purple-400">{user.available_votes} available</div>
            <input
              type="number"
              value={votes}
              onChange={(e) => setVotes(e.target.value)}
              className="bg-transparent border rounded px-3 py-2 w-32 text-center text-2xl"
              min="1"
              max={user.available_votes}
            />
            <button
              onClick={handleAllocate}
              disabled={Number(votes) > user.available_votes}
              className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 disabled:opacity-50"
            >
              allocate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
