import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      nutrition_goals: {
        Row: {
          id: string;
          user_id: string;
          daily_calorie_target: number;
          protein_grams_target: number;
          carbs_grams_target: number;
          fat_grams_target: number;
          sodium_mg_limit: number;
          fiber_grams_target: number;
          iron_mg_target: number;
          calcium_mg_target: number;
          created_at: string;
          updated_at: string;
        };
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_date: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          dining_hall: string;
          meal_name: string;
          created_at: string;
        };
      };
      nutrition_data: {
        Row: {
          id: string;
          meal_id: string;
          calories: number;
          protein_grams: number;
          carbs_grams: number;
          fat_grams: number;
          sodium_mg: number;
          fiber_grams: number;
          sugar_grams: number;
          iron_mg: number;
          calcium_mg: number;
          vitamin_c_mg: number;
          vitamin_d_mcg: number;
        };
      };
    };
  };
}
