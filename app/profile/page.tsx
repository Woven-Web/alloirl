'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Profile {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  projects: {
    id: string;
    name: string;
  };
}

interface EventParticipation {
  id: string;
  available_votes: number;
  events: {
    id: string;
    name: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [participations, setParticipations] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          projects (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch event participations
      const { data: participationsData } = await supabase
        .from('event_participants')
        .select(`
          id,
          available_votes,
          events (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      setProfile(profileData);
      
      // Transform transactions data to ensure projects is a single object
      const transformedTransactions = (transactionsData || []).map(t => ({
        ...t,
        projects: Array.isArray(t.projects) ? t.projects[0] : t.projects
      })) as Transaction[];
      setTransactions(transformedTransactions);

      // Transform participations data to ensure events is a single object
      const transformedParticipations = (participationsData || []).map(p => ({
        ...p,
        events: Array.isArray(p.events) ? p.events[0] : p.events
      })) as EventParticipation[];
      setParticipations(transformedParticipations);
      setLoading(false);
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-4">Profile not found</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-brand-blue">{profile.name}</h1>
        <Link href="/profile/edit">
          <Button variant="outline">Edit Profile</Button>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-blue">Recent Allocations</h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 border rounded-lg bg-white shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <Link 
                    href={`/projects/${transaction.projects.id}`}
                    className="font-medium hover:text-brand-blue"
                  >
                    {transaction.projects.name}
                  </Link>
                  <span className="font-semibold">{transaction.amount} votes</span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent allocations</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-blue">Active Rounds</h2>
        {participations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {participations.map((participation) => (
              <Link
                key={participation.id}
                href={`/events/${participation.events.id}`}
                className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="font-medium">{participation.events.name}</div>
                <div className="text-sm text-gray-500">
                  {participation.available_votes} votes remaining
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Not participating in any rounds</p>
        )}
      </section>
    </div>
  );
}
