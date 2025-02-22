export interface Project {
  // Required fields (from Supabase schema)
  id: string;

  // Optional fields (nullable in database)
  name: string | null;
  description: string | null;
  event_id: string | null;
  created_at: string | null;
  metadata: Json | null;

  // Virtual fields (computed/joined from other tables)
  total_votes?: number;
  unique_voters?: number;
  last_updated?: string | null;

  // Join fields
  event?: {
    id: string;
    name: string | null;
  };
}

// Project with nested event type for joins
export interface ProjectWithEvent {
  id: string;
  name: string | null;
  event: {
    id: string;
    name: string | null;
  };
}

// Supabase JSON type
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Project allocation type (from project_allocations table)
export interface ProjectAllocation {
  id: string;
  event_id: string | null;
  project_id: string | null;
  user_id: string;
  votes: number;
  created_at: string;
  updated_at: string | null;
  reaction?: string | null;
}

// Project votes type (from project_votes view)
export interface ProjectVotes {
  project_id: string | null;
  total_votes: number | null;
  unique_voters: number | null;
  last_updated: string | null;
}

// Project contactless link type (from project_contactless_links table)
export interface ProjectContactlessLink {
  id: number;
  created_at: string;
  project_id: string | null;
  name: string | null;
  slug: string;
}
