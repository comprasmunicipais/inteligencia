export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          slug?: string
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'user'
          email: string
        }
        Insert: {
          id: string
          tenant_id: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
          email: string
        }
        Update: {
          id?: string
          tenant_id?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
          email?: string
        }
      }
      pipeline_stages: {
        Row: {
          id: string
          tenant_id: string
          name: string
          order_index: number
          color: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          order_index: number
          color?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          order_index?: number
          color?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          tenant_id: string
          name: string
          cnpj: string | null
          state: string | null
          city: string | null
          website: string | null
          status: 'prospect' | 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          cnpj?: string | null
          state?: string | null
          city?: string | null
          website?: string | null
          status?: 'prospect' | 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          cnpj?: string | null
          state?: string | null
          city?: string | null
          website?: string | null
          status?: 'prospect' | 'active' | 'inactive'
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          tenant_id: string
          account_id: string
          stage_id: string
          title: string
          value: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id: string
          stage_id: string
          title: string
          value?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string
          stage_id?: string
          title?: string
          value?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          tenant_id: string
          deal_id: string | null
          title: string
          due_date: string | null
          status: 'pending' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          deal_id?: string | null
          title: string
          due_date?: string | null
          status?: 'pending' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          deal_id?: string | null
          title?: string
          due_date?: string | null
          status?: 'pending' | 'completed'
          created_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          title: string
          description: string | null
          source: string
          external_id: string
          value_est: number | null
          state: string | null
          city: string | null
          published_at: string
          status: 'new' | 'viewed' | 'saved' | 'discarded'
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          source: string
          external_id: string
          value_est?: number | null
          state?: string | null
          city?: string | null
          published_at?: string
          status?: 'new' | 'viewed' | 'saved' | 'discarded'
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          source?: string
          external_id?: string
          value_est?: number | null
          state?: string | null
          city?: string | null
          published_at?: string
          status?: 'new' | 'viewed' | 'saved' | 'discarded'
        }
      }
    }
  }
}
