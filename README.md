# 🚀 CoinPower Deployment Guide for Vercel

This guide provides instructions for deploying your CoinPower application to Vercel, the recommended hosting platform for this Next.js project.

---

## 🚨 Critical: Connecting Supabase to Vercel

For your live app on Vercel to function correctly, you **must** copy your Supabase keys into your Vercel project settings. This allows your Vercel deployment to connect to your Supabase database.

### Step-by-Step Instructions:

1.  **Log in to Vercel** and go to your CoinPower project dashboard.
2.  Go to the **Settings** tab and click on **Environment Variables** in the side menu.
3.  You will need to add three variables. For each one, enter the **Name** and **Value** exactly as shown below, then click **Add**.

    ---

    #### Variable 1: Supabase URL
    -   **Name**: `NEXT_PUBLIC_SUPABASE_URL`
    -   **Value**: `https://ifdhcwsigjankvidokko.supabase.co`
    -   *Leave all checkboxes unchecked.*

    ---

    #### Variable 2: Public / Anon Key
    -   **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTc0NzcsImV4cCI6MjA4OTMzMzQ3N30.i9A0x-i9xS0sYt_M4S_jXlJqK0cZ8eX3pW7bN6eD2fM`
    -   *Leave all checkboxes unchecked.*

    ---

    #### Variable 3: Secret Service Role Key
    -   **Name**: `SUPABASE_SERVICE_ROLE_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NzQ3NywiZXhwIjoyMDg5MzMzNDc3fQ.WYLx7zUkc0pl_02HpM1ULXTNKi_AWeXjD8EEYBbKrJc`
    -   **Important:** You must select the **"Secret"** type for this variable in Vercel to keep it secure.

    ---

4.  **Re-deploy Your Project.** After adding all three variables, go to the **Deployments** tab in Vercel. Find the latest deployment, click the "..." menu, and choose **Redeploy**. This will apply the new environment variables.

**Why is this necessary?**
- Your **public** keys (`NEXT_PUBLIC_...`) are used by the browser to fetch data securely.
- Your **secret** key (`SUPABASE_SERVICE_ROLE_KEY`) is used by the server-side part of your app (the Admin Panel) to perform administrative tasks. It must be kept secret.

By following these steps, your Vercel app will be able to communicate with your Supabase database, and all features, including the Admin Panel, will work correctly.

---

### Deployment on Vercel

Vercel makes deployment simple.

1.  **Import Project**: Import your GitHub repository into Vercel.
2.  **Configure Project**: Vercel will automatically detect that this is a Next.js project. The default settings are correct.
3.  **Add Environment Variables**: Follow the critical instructions at the top of this guide.
4.  **Deploy**: Click the **Deploy** button.

---

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
DECLARE
  generated_username TEXT;
  generated_referral_code TEXT;
BEGIN
  -- Use the provided username, or generate one from the email if it's missing
  generated_username := COALESCE(
    NULLIF(new.raw_user_meta_data->>'username', ''),
    split_part(new.email, '@', 1)
  );

  -- Generate a referral code if one isn't provided
  generated_referral_code := COALESCE(
    NULLIF(new.raw_user_meta_data->>'referral_code', ''),
    'CP-' || upper(substr(md5(random()::text), 0, 10))
  );

  -- Create the profile with fallback default values
  INSERT INTO public.profiles (id, full_name, username, email, country, phone, referral_code, referred_by, balance, has_withdrawal_pin)
  VALUES (
    new.id,
    -- If full_name is missing, use the username as a fallback
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), generated_username),
    generated_username,
    new.email,
    -- If country is missing, default to 'Ghana'
    COALESCE(NULLIF(new.raw_user_meta_data->>'country', ''), 'Ghana'),
    -- If phone is missing, use a placeholder
    COALESCE(NULLIF(new.raw_user_meta_data->>'phone', ''), 'Not provided'),
    generated_referral_code,
    new.raw_user_meta_data->>'referred_by',
    1.00,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
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
  details text,
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

-- Policy: Allow anonymous uploads to the site_assets bucket for admin use
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to site_assets" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to site_assets"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'site_assets' );

-- =================================================================
-- 5. DEFAULT GENERATOR DATA (OPTIONAL)
-- Seeds the database with the default power generators.
-- =================================================================
INSERT INTO public.generators (id, name, subtitle, icon, color, price, expire_days, daily_income, published, roi, period, min_invest, max_invest, investors, image_url)
VALUES
  ('pg1', 'PG1 Generator', 'Basic Power', '⚡', 'from-amber-400 to-orange-500', 0, 2, 0.5, true, '10%', 'Daily', '$0', '$0', '12050', 'https://picsum.photos/seed/genpg1/300/300'),
  ('pg2', 'PG2 Generator', 'Standard Power', '🔋', 'from-green-400 to-emerald-600', 25, 30, 2.5, true, '12%', 'Daily', '$25', '$1000', '8520', 'https://picsum.photos/seed/genpg2/300/300'),
  ('pg3', 'PG3 Generator', 'Mega Power', '💡', 'from-blue-400 to-indigo-600', 100, 45, 10, true, '15%', 'Daily', '$100', '$5000', '4310', 'https://picsum.photos/seed/genpg3/300/300'),
  ('pg4', 'PG4 Generator', 'Ultra Power', '🚀', 'from-purple-500 to-pink-600', 500, 60, 55, true, '20%', 'Daily', '$500', '$20000', '1250', 'https://picsum.photos/seed/genpg4/300/300')
ON CONFLICT(id) DO NOTHING;

-- =================================================================
-- 6. DEFAULT MEDIA DATA (OPTIONAL)
-- Seeds the media table with default placeholder images.
-- =================================================================
INSERT INTO public.media (id, url) VALUES
  ('activity-hero', 'https://picsum.photos/seed/activityhero/1200/400'),
  ('activity-teamwork', 'https://picsum.photos/seed/activityteam/600/400'),
  ('ceo-portrait', 'https://picsum.photos/seed/romanocEO/200/200'),
  ('app-logo', 'https://picsum.photos/seed/coinpowerlogo/64/64'),
  ('leader-tn', 'https://picsum.photos/seed/leadertn/200/200'),
  ('leader-jc', 'https://picsum.photos/seed/leaderjc/200/200'),
  ('leader-sm', 'https://picsum.photos/seed/leadersm/200/200'),
  ('payment-usdt', 'https://picsum.photos/seed/paymentusdt/100/100'),
  ('payment-mtn-momo', 'https://picsum.photos/seed/paymentmomo/100/100'),
  ('payment-telecel', 'https://picsum.photos/seed/paymenttelecel/100/100'),
  ('payment-bank-transfer', 'https://picsum.photos/seed/paymentbank/100/100'),
  ('payment-western-union', 'https://picsum.photos/seed/paymentwu/100/100'),
  ('payment-card', 'https://picsum.photos/seed/paymentcard/100/100')
ON CONFLICT(id) DO NOTHING;

-- =================================================================
-- 7. GIFT CODES TABLE
-- Stores gift codes that can be redeemed for balance.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  note text,
  is_redeemed boolean DEFAULT false NOT NULL,
  redeemed_at timestamp with time zone,
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage gift codes
DROP POLICY IF EXISTS "Admins can manage gift codes." ON public.gift_codes;
CREATE POLICY "Admins can manage gift codes."
ON public.gift_codes FOR ALL
USING (true)
WITH CHECK (true);

-- Policy: Users can view their own redeemed codes (optional, for history)
DROP POLICY IF EXISTS "Users can view their own redeemed codes." ON public.gift_codes;
CREATE POLICY "Users can view their own redeemed codes."
ON public.gift_codes FOR SELECT
USING (auth.uid() = redeemed_by_user_id);


-- =================================================================
-- 8. RPC FUNCTION FOR CODE REDEMPTION
-- Atomically redeems a gift code and updates user balance.
-- =================================================================
CREATE OR REPLACE FUNCTION redeem_gift_code(user_id_in uuid, code_in text)
RETURNS numeric AS $$
DECLARE
  code_record record;
  redeemed_amount numeric;
BEGIN
  -- Find and lock the code row
  SELECT * INTO code_record FROM public.gift_codes WHERE code = code_in FOR UPDATE;

  -- Check if code exists and is not redeemed
  IF NOT FOUND OR code_record.is_redeemed THEN
    RETURN NULL; -- Or raise an exception
  END IF;

  -- Update the code record
  UPDATE public.gift_codes
  SET 
    is_redeemed = true,
    redeemed_at = now(),
    redeemed_by_user_id = user_id_in
  WHERE id = code_record.id;

  -- Update the user's balance
  UPDATE public.profiles
  SET balance = balance + code_record.amount
  WHERE id = user_id_in;
  
  redeemed_amount := code_record.amount;

  RETURN redeemed_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


```