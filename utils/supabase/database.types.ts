export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      event_allowlist: {
        Row: {
          created_at: string | null
          email: string
          event_id: string | null
          has_registered: boolean | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          event_id?: string | null
          has_registered?: boolean | null
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          event_id?: string | null
          has_registered?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_allowlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_allowlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          available_votes: number
          created_at: string | null
          event_id: string
          id: string
          is_admin: boolean
          user_id: string
        }
        Insert: {
          available_votes?: number
          created_at?: string | null
          event_id: string
          id?: string
          is_admin?: boolean
          user_id: string
        }
        Update: {
          available_votes?: number
          created_at?: string | null
          event_id?: string
          id?: string
          is_admin?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          gitcoin_round_id: number | null
          id: string
          name: string | null
          start_date: string | null
          vote_limit: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gitcoin_round_id?: number | null
          id?: string
          name?: string | null
          start_date?: string | null
          vote_limit?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gitcoin_round_id?: number | null
          id?: string
          name?: string | null
          start_date?: string | null
          vote_limit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          name_requested: boolean
          photo_url: string | null
        }
        Insert: {
          admin?: boolean | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          name_requested?: boolean
          photo_url?: string | null
        }
        Update: {
          admin?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          name_requested?: boolean
          photo_url?: string | null
        }
        Relationships: []
      }
      project_allocations: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          project_id: string | null
          reaction: string | null
          updated_at: string | null
          user_id: string
          votes: number
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          project_id?: string | null
          reaction?: string | null
          updated_at?: string | null
          user_id: string
          votes?: number
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          project_id?: string | null
          reaction?: string | null
          updated_at?: string | null
          user_id?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_votes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contactless_links: {
        Row: {
          created_at: string
          id: number
          name: string | null
          project_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          project_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          project_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contactless_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_votes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contactless_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          attestation_error: string | null
          attestation_status: string | null
          created_at: string | null
          event_id: string | null
          id: string
          previous_amount: number | null
          project_id: string | null
          transaction_hash: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          attestation_error?: string | null
          attestation_status?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          previous_amount?: number | null
          project_id?: string | null
          transaction_hash?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          attestation_error?: string | null
          attestation_status?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          previous_amount?: number | null
          project_id?: string | null
          transaction_hash?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_votes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      events_public: {
        Row: {
          description: string | null
          end_date: string | null
          id: string | null
          name: string | null
          start_date: string | null
        }
        Insert: {
          description?: string | null
          end_date?: string | null
          id?: string | null
          name?: string | null
          start_date?: string | null
        }
        Update: {
          description?: string | null
          end_date?: string | null
          id?: string | null
          name?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      project_votes: {
        Row: {
          last_updated: string | null
          project_id: string | null
          total_votes: number | null
          unique_voters: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_votes: {
        Args: {
          p_event_id: string
          p_project_id: string
          p_amount: number
        }
        Returns: undefined
      }
    }
    Enums: {
      transaction_type:
        | "credit_grant"
        | "vote_allocation"
        | "vote_update"
        | "vote_removal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
