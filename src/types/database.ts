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
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      google_connections: {
        Row: {
          id: string
          user_id: string
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expiry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ads_accounts: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          name: string | null
          is_selected: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          name?: string | null
          is_selected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          name?: string | null
          is_selected?: boolean
          created_at?: string
        }
      }
      reports_cache: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          date_start: string
          date_end: string
          report_type: string
          payload_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          date_start: string
          date_end: string
          report_type: string
          payload_json: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          date_start?: string
          date_end?: string
          report_type?: string
          payload_json?: Json
          created_at?: string
        }
      }
      user_ai_settings: {
        Row: {
          id: string
          user_id: string
          openai_api_key: string | null
          preferred_model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          openai_api_key?: string | null
          preferred_model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          openai_api_key?: string | null
          preferred_model?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
