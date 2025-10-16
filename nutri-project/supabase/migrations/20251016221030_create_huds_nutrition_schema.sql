/*
  # HUDS Nutrition Analyzer Database Schema

  ## Overview
  This migration creates the complete database schema for the Harvard University Dining Services
  Nutrition Analyzer application, enabling students to track meals, set diet goals, and analyze
  their nutritional intake over time.

  ## New Tables

  ### 1. `user_profiles`
  Stores Harvard student profile information and preferences
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - Student email address
  - `full_name` (text) - Student full name
  - `student_id` (text, optional) - Harvard student ID
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `diet_goals`
  Stores user-defined nutrition goals and targets
  - `id` (uuid, primary key) - Goal identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `goal_name` (text) - Name/description of the goal
  - `target_calories` (integer) - Daily calorie target
  - `target_protein_g` (numeric) - Daily protein target in grams
  - `target_carbs_g` (numeric) - Daily carbohydrate target in grams
  - `target_fat_g` (numeric) - Daily fat target in grams
  - `target_sodium_mg` (numeric) - Daily sodium limit in milligrams
  - `target_calcium_mg` (numeric, optional) - Daily calcium target
  - `target_iron_mg` (numeric, optional) - Daily iron target
  - `is_active` (boolean) - Whether this goal set is currently active
  - `created_at` (timestamptz) - Goal creation timestamp
  - `updated_at` (timestamptz) - Last goal update timestamp

  ### 3. `meal_logs`
  Stores individual meal entries logged by users
  - `id` (uuid, primary key) - Meal log identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `meal_date` (date) - Date of the meal
  - `meal_time` (timestamptz) - Time of the meal
  - `meal_type` (text) - Type: breakfast, lunch, dinner, snack
  - `dining_hall` (text, optional) - HUDS dining hall location
  - `photo_url` (text, optional) - URL to meal photo
  - `notes` (text, optional) - User notes about the meal
  - `created_at` (timestamptz) - Log creation timestamp

  ### 4. `meal_items`
  Stores individual food items within each meal
  - `id` (uuid, primary key) - Item identifier
  - `meal_log_id` (uuid, foreign key) - References meal_logs
  - `food_name` (text) - Name of the food item
  - `serving_size` (text, optional) - Serving size description
  - `calories` (integer) - Calories in this item
  - `protein_g` (numeric) - Protein in grams
  - `carbs_g` (numeric) - Carbohydrates in grams
  - `fat_g` (numeric) - Fat in grams
  - `sodium_mg` (numeric) - Sodium in milligrams
  - `calcium_mg` (numeric, optional) - Calcium in milligrams
  - `iron_mg` (numeric, optional) - Iron in milligrams
  - `fiber_g` (numeric, optional) - Dietary fiber in grams
  - `sugar_g` (numeric, optional) - Sugar in grams
  - `created_at` (timestamptz) - Item creation timestamp

  ### 5. `chat_messages`
  Stores conversation history between users and the AI assistant
  - `id` (uuid, primary key) - Message identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `role` (text) - Message role: 'user' or 'assistant'
  - `content` (text) - Message content
  - `visualization_data` (jsonb, optional) - Chart/card data if applicable
  - `created_at` (timestamptz) - Message timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled to ensure users can only access their own data.

  ### Policies
  For each table, separate policies are created for:
  - SELECT: Users can view their own data
  - INSERT: Users can create their own records
  - UPDATE: Users can update their own records
  - DELETE: Users can delete their own records

  ## Important Notes
  1. All tables use UUID primary keys with automatic generation
  2. Foreign key constraints ensure data integrity
  3. Timestamps are automatically managed with defaults
  4. Numeric types are used for precise nutritional values
  5. JSONB is used for flexible visualization data storage
  6. All operations require authentication
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  student_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create diet_goals table
CREATE TABLE IF NOT EXISTS diet_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  goal_name text NOT NULL DEFAULT 'My Diet Goal',
  target_calories integer NOT NULL DEFAULT 2000,
  target_protein_g numeric(6,2) NOT NULL DEFAULT 50.00,
  target_carbs_g numeric(6,2) NOT NULL DEFAULT 250.00,
  target_fat_g numeric(6,2) NOT NULL DEFAULT 70.00,
  target_sodium_mg numeric(7,2) DEFAULT 2300.00,
  target_calcium_mg numeric(7,2) DEFAULT 1000.00,
  target_iron_mg numeric(5,2) DEFAULT 8.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE diet_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON diet_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own goals"
  ON diet_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON diet_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON diet_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create meal_logs table
CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  meal_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_time timestamptz NOT NULL DEFAULT now(),
  meal_type text NOT NULL DEFAULT 'lunch',
  dining_hall text,
  photo_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_meal_type CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'))
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_time ON meal_logs(user_id, meal_time DESC);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meal logs"
  ON meal_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create meal_items table
CREATE TABLE IF NOT EXISTS meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  serving_size text,
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(6,2) NOT NULL DEFAULT 0.00,
  carbs_g numeric(6,2) NOT NULL DEFAULT 0.00,
  fat_g numeric(6,2) NOT NULL DEFAULT 0.00,
  sodium_mg numeric(7,2) DEFAULT 0.00,
  calcium_mg numeric(7,2) DEFAULT 0.00,
  iron_mg numeric(5,2) DEFAULT 0.00,
  fiber_g numeric(5,2) DEFAULT 0.00,
  sugar_g numeric(6,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_log ON meal_items(meal_log_id);

ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal items"
  ON meal_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own meal items"
  ON meal_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own meal items"
  ON meal_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meal items"
  ON meal_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  visualization_data jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_time ON chat_messages(user_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());