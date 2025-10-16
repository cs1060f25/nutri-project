import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
};

export type DietGoal = {
  id: string;
  user_id: string;
  goal_name: string;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_sodium_mg: number;
  target_calcium_mg?: number;
  target_iron_mg?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MealLog = {
  id: string;
  user_id: string;
  meal_date: string;
  meal_time: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dining_hall?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
};

export type MealItem = {
  id: string;
  meal_log_id: string;
  food_name: string;
  serving_size?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  calcium_mg?: number;
  iron_mg?: number;
  fiber_g?: number;
  sugar_g?: number;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  visualization_data?: any;
  created_at: string;
};
