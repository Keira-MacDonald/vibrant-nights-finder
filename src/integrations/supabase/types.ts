export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string
          created_at: string
          email_status: string
          email_to: string | null
          id: string
          kind: string
          read_at: string | null
          reservation_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          email_status?: string
          email_to?: string | null
          id?: string
          kind: string
          read_at?: string | null
          reservation_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          email_status?: string
          email_to?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          reservation_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          checked_in_at: string | null
          confirmation_code: string | null
          contact_email: string | null
          created_at: string
          event_id: string | null
          guest_name: string
          id: string
          kind: Database["public"]["Enums"]["reservation_kind"]
          notes: string | null
          party_size: number
          phone: string | null
          place_id: string
          reserved_for: string
          status: string
          updated_at: string
          user_id: string
          venue_address: string | null
          venue_name: string
        }
        Insert: {
          checked_in_at?: string | null
          confirmation_code?: string | null
          contact_email?: string | null
          created_at?: string
          event_id?: string | null
          guest_name: string
          id?: string
          kind?: Database["public"]["Enums"]["reservation_kind"]
          notes?: string | null
          party_size?: number
          phone?: string | null
          place_id: string
          reserved_for: string
          status?: string
          updated_at?: string
          user_id: string
          venue_address?: string | null
          venue_name: string
        }
        Update: {
          checked_in_at?: string | null
          confirmation_code?: string | null
          contact_email?: string | null
          created_at?: string
          event_id?: string | null
          guest_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["reservation_kind"]
          notes?: string | null
          party_size?: number
          phone?: string | null
          place_id?: string
          reserved_for?: string
          status?: string
          updated_at?: string
          user_id?: string
          venue_address?: string | null
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "venue_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_availability: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["reservation_kind"]
          place_id: string
          service_date: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["reservation_kind"]
          place_id: string
          service_date: string
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["reservation_kind"]
          place_id?: string
          service_date?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      venue_events: {
        Row: {
          cover_charge: number | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          is_published: boolean
          lineup: string | null
          place_id: string
          starts_at: string
          title: string
          updated_at: string
          venue_name: string
        }
        Insert: {
          cover_charge?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          lineup?: string | null
          place_id: string
          starts_at: string
          title: string
          updated_at?: string
          venue_name: string
        }
        Update: {
          cover_charge?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          lineup?: string | null
          place_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
          venue_name?: string
        }
        Relationships: []
      }
      venue_managers: {
        Row: {
          created_at: string
          id: string
          place_id: string
          user_id: string
          venue_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          user_id: string
          venue_name: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
          venue_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manages_venue: {
        Args: { _place_id: string; _user_id: string }
        Returns: boolean
      }
      venue_availability_status: {
        Args: { _place_id: string; _service_date: string }
        Returns: {
          booked: number
          kind: Database["public"]["Enums"]["reservation_kind"]
          remaining: number
          total_capacity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "venue_manager"
      reservation_kind: "booth" | "table" | "door"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "venue_manager"],
      reservation_kind: ["booth", "table", "door"],
    },
  },
} as const
