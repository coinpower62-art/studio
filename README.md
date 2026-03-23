# Firebase Studio

This is a NextJS starter app built with Supabase and shadcn/ui.

## Getting Started

Your Supabase credentials have been added to the `.env` file. To get started with your local development environment:

1.  **Create a `.env.local` file** by making a copy of the `.env` file. This file will not be committed to git and will load the environment variables for your local development.

    ```bash
    cp .env .env.local
    ```

2.  **Run the development server**:

    ```bash
    npm run dev
    ```

Your app should now be running on [http://localhost:9002](http://localhost:9002).

## Supabase Database Setup

Run the following SQL in your Supabase SQL Editor to set up the necessary tables and policies for the application.

```sql
-- =================================================================
-- 1. PROFILES TABLE (FOR USERS)
-- Stores public-facing user data and links to Supabase Auth.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  username text UNIQUE,
  full_name text,
  email text UNIQUE,
  country text,
  phone text,
  balance numeric(10, 2) DEFAULT 0.00,
  referral_code text UNIQUE,
  referred_by text,
  has_withdrawal_pin boolean DEFAULT false NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =================================================================
-- 2. AUTOMATIC PROFILE CREATION
-- This function and trigger automatically create a profile for new users.
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, email, country, phone, referral_code, referred_by, balance, has_withdrawal_pin)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'referral_code',
    new.raw_user_meta_data->>'referred_by',
    (new.raw_user_meta_data->>'balance')::numeric,
    (new.raw_user_meta_data->>'has_withdrawal_pin')::boolean
  )
  ON CONFLICT (id) DO NOTHING;
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =================================================================
-- 3. APP-SPECIFIC TABLES
-- These tables store data for generators, transactions, etc.
-- =================================================================

-- Generators Table
CREATE TABLE IF NOT EXISTS public.generators (
  id text NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name text,
  subtitle text,
  icon text,
  color text,
  price numeric DEFAULT 0,
  expire_days integer,
  daily_income numeric DEFAULT 0,
  published boolean DEFAULT false,
  roi text,
  period text,
  min_invest text,
  max_invest text,
  investors text,
  image_url text
);
ALTER TABLE public.generators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Generators are viewable by everyone." ON public.generators;
CREATE POLICY "Generators are viewable by everyone." ON public.generators FOR SELECT USING (true);

-- Media Table
CREATE TABLE IF NOT EXISTS public.media (
  id text NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  url text
);
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Media is viewable by everyone." ON public.media;
CREATE POLICY "Media is viewable by everyone." ON public.media FOR SELECT USING (true);

-- Deposit Requests Table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  amount numeric,
  tx_id text,
  status text
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own deposit requests." ON public.deposit_requests;
CREATE POLICY "Users can view their own deposit requests." ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create deposit requests." ON public.deposit_requests;
CREATE POLICY "Users can create deposit requests." ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  country text,
  method text,
  amount numeric,
  net_amount numeric,
  fee numeric,
  details jsonb,
  status text
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests." ON public.withdrawal_requests;
CREATE POLICY "Users can view their own withdrawal requests." ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create withdrawal requests." ON public.withdrawal_requests;
CREATE POLICY "Users can create withdrawal requests." ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rented Generators Table
CREATE TABLE IF NOT EXISTS public.rented_generators (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generator_id text REFERENCES public.generators(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  rented_at timestamp with time zone,
  expires_at timestamp with time zone,
  last_claimed_at timestamp with time zone,
  suspended boolean DEFAULT false NOT NULL
);
ALTER TABLE public.rented_generators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own rented generators." ON public.rented_generators;
CREATE POLICY "Users can manage their own rented generators." ON public.rented_generators FOR ALL USING (auth.uid() = user_id);

-- =================================================================
-- 4. STORAGE SETUP
-- Creates the 'site_assets' bucket and sets access policies.
-- =================================================================

-- Create the bucket for site assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow public read access to all files in the bucket
DROP POLICY IF EXISTS "Public read access for site assets" ON storage.objects;
CREATE POLICY "Public read access for site assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'site_assets' );

-- Policy: Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'site_assets' );

-- =================================================================
-- 5. DEFAULT DATA (OPTIONAL)
-- Seeds the database with the default power generators.
-- =================================================================
INSERT INTO public.generators (id, name, subtitle, icon, color, price, expire_days, daily_income, published, roi, period, min_invest, max_invest, investors)
VALUES
  ('pg1', 'PG1 Generator', 'Basic Power', '⚡', 'from-amber-400 to-orange-500', 0, 2, 0.5, true, '10%', 'Daily', '$0', '$0', '12050'),
  ('pg2', 'PG2 Generator', 'Standard Power', '🔋', 'from-green-400 to-emerald-600', 25, 30, 2.5, true, '12%', 'Daily', '$25', '$1000', '8520'),
  ('pg3', 'PG3 Generator', 'Mega Power', '💡', 'from-blue-400 to-indigo-600', 100, 45, 10, true, '15%', 'Daily', '$100', '$5000', '4310'),
  ('pg4', 'PG4 Generator', 'Ultra Power', '🚀', 'from-purple-500 to-pink-600', 500, 60, 55, true, '20%', 'Daily', '$500', '$20000', '1250')
ON CONFLICT(id) DO NOTHING;



