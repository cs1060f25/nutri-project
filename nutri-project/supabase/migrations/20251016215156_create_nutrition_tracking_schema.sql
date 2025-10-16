/*
  # HUDS Nutrition Tracking Schema

  ## Overview
  This migration creates the database schema for the Harvard University Dining Services 
  Nutrition Analyzer prototype, enabling students to track meals, set diet goals, and 
  analyze their nutrition intake patterns over time.

  ## New Tables
  
  ### 1. `user_profiles`
  Stores basic user information for Harvard students
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - Student email address
  - `full_name` (text) - Student's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `nutrition_goals`
  Stores user-defined dietary goals and targets
  - `id` (uuid, primary key) - Unique goal identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `daily_calorie_target` (integer) - Target daily calories
  - `protein_grams_target` (decimal) - Target protein in grams
  - `carbs_grams_target` (decimal) - Target carbohydrates in grams
  - `fat_grams_target` (decimal) - Target fat in grams
  - `sodium_mg_limit` (integer) - Maximum sodium in milligrams
  - `fiber_grams_target` (decimal) - Target fiber in grams
  - `iron_mg_target` (decimal) - Target iron in milligrams
  - `calcium_mg_target` (decimal) - Target calcium in milligrams
  - `created_at` (timestamptz) - Goal creation timestamp
  - `updated_at` (timestamptz) - Last goal update timestamp

  ### 3. `meals`
  Stores logged meal entries from dining halls or photo analysis
  - `id` (uuid, primary key) - Unique meal identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `meal_date` (date) - Date of meal consumption
  - `meal_type` (text) - Type: breakfast, lunch, dinner, snack
  - `dining_hall` (text) - HUDS dining hall location
  - `meal_name` (text) - Name or description of meal
  - `created_at` (timestamptz) - Entry creation timestamp

  ### 4. `nutrition_data`
  Stores detailed nutritional information for each meal
  - `id` (uuid, primary key) - Unique nutrition entry identifier
  - `meal_id` (uuid, foreign key) - References meals
  - `calories` (integer) - Total calories
  - `protein_grams` (decimal) - Protein content in grams
  - `carbs_grams` (decimal) - Carbohydrate content in grams
  - `fat_grams` (decimal) - Fat content in grams
  - `sodium_mg` (integer) - Sodium content in milligrams
  - `fiber_grams` (decimal) - Fiber content in grams
  - `sugar_grams` (decimal) - Sugar content in grams
  - `iron_mg` (decimal) - Iron content in milligrams
  - `calcium_mg` (decimal) - Calcium content in milligrams
  - `vitamin_c_mg` (decimal) - Vitamin C content in milligrams
  - `vitamin_d_mcg` (decimal) - Vitamin D content in micrograms

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations restricted by user_id

  ## Important Notes
  1. Mock data will be generated separately for prototype demonstration
  2. All nutrition values use standard units (grams, milligrams, micrograms)
  3. Meal types are constrained to specific values for consistency
  4. Foreign key constraints ensure data integrity
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create nutrition_goals table
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  daily_calorie_target integer DEFAULT 2000,
  protein_grams_target decimal(6,2) DEFAULT 50.0,
  carbs_grams_target decimal(6,2) DEFAULT 275.0,
  fat_grams_target decimal(6,2) DEFAULT 78.0,
  sodium_mg_limit integer DEFAULT 2300,
  fiber_grams_target decimal(6,2) DEFAULT 28.0,
  iron_mg_target decimal(6,2) DEFAULT 8.0,
  calcium_mg_target decimal(6,2) DEFAULT 1000.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  meal_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  dining_hall text NOT NULL,
  meal_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create nutrition_data table
CREATE TABLE IF NOT EXISTS nutrition_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE NOT NULL,
  calories integer DEFAULT 0,
  protein_grams decimal(6,2) DEFAULT 0.0,
  carbs_grams decimal(6,2) DEFAULT 0.0,
  fat_grams decimal(6,2) DEFAULT 0.0,
  sodium_mg integer DEFAULT 0,
  fiber_grams decimal(6,2) DEFAULT 0.0,
  sugar_grams decimal(6,2) DEFAULT 0.0,
  iron_mg decimal(6,2) DEFAULT 0.0,
  calcium_mg decimal(6,2) DEFAULT 0.0,
  vitamin_c_mg decimal(6,2) DEFAULT 0.0,
  vitamin_d_mcg decimal(6,2) DEFAULT 0.0,
  UNIQUE(meal_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user ON nutrition_goals(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for nutrition_goals
CREATE POLICY "Users can view own goals"
  ON nutrition_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own goals"
  ON nutrition_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON nutrition_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON nutrition_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for meals
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for nutrition_data
CREATE POLICY "Users can view nutrition data for own meals"
  ON nutrition_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = nutrition_data.meal_id
      AND meals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert nutrition data for own meals"
  ON nutrition_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = nutrition_data.meal_id
      AND meals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nutrition data for own meals"
  ON nutrition_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = nutrition_data.meal_id
      AND meals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = nutrition_data.meal_id
      AND meals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nutrition data for own meals"
  ON nutrition_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = nutrition_data.meal_id
      AND meals.user_id = auth.uid()
    )
  );