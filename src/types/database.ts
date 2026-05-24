export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: 'free' | 'pro';
          onboarding_complete: boolean;
          extension_token: string | null;
          extension_token_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: 'free' | 'pro';
          onboarding_complete?: boolean;
          extension_token?: string | null;
          extension_token_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: 'free' | 'pro';
          onboarding_complete?: boolean;
          extension_token?: string | null;
          extension_token_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      boards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          color: string;
          image_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          color?: string;
          image_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cover_url?: string | null;
          color?: string;
          image_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      images: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          url: string;
          width: number | null;
          height: number | null;
          size_bytes: number | null;
          note: string;
          is_favorite: boolean;
          palette: string[];
          fingerprint: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          url: string;
          width?: number | null;
          height?: number | null;
          size_bytes?: number | null;
          note?: string;
          is_favorite?: boolean;
          palette?: string[];
          fingerprint?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          user_id?: string;
          filename?: string;
          storage_path?: string;
          url?: string;
          width?: number | null;
          height?: number | null;
          size_bytes?: number | null;
          note?: string;
          is_favorite?: boolean;
          palette?: string[];
          fingerprint?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          user_id: string;
          name: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          user_id?: string;
          name?: string;
        };
      };
      image_categories: {
        Row: {
          image_id: string;
          category_id: string;
        };
        Insert: {
          image_id: string;
          category_id: string;
        };
        Update: {
          image_id?: string;
          category_id?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: 'free' | 'pro';
          razorpay_subscription_id: string | null;
          razorpay_customer_id: string | null;
          status: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: 'free' | 'pro';
          razorpay_subscription_id?: string | null;
          razorpay_customer_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: 'free' | 'pro';
          razorpay_subscription_id?: string | null;
          razorpay_customer_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
