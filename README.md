# 🚀 CoinPower Deployment Guide for Cloudflare Pages

This guide provides step-by-step instructions for deploying your CoinPower application to Cloudflare Pages.

---

## 1. Connect Your GitHub Repository

1.  Log in to your Cloudflare dashboard.
2.  Go to **Workers & Pages** and click **Create application**.
3.  Select the **Pages** tab and click **Connect to Git**.
4.  Choose the GitHub repository for your CoinPower project and click **Begin setup**.

---

## 2. Configure Your Build Settings

This is the most important step. On the "Set up builds and deployments" screen, you **MUST** use the following settings:

-   **Framework preset**: Select `Next.js`.
-   **Build command**: Enter `next build`
-   **Build output directory**: Leave this field **EMPTY**.

> **Warning:** Do NOT use `npx @cloudflare/next-on-pages` as the build command. Cloudflare's Next.js preset handles this automatically. Setting the output directory will also cause errors.

---

## 3. Add Environment Variables

After configuring the build settings, click the **Save and Deploy** button. The first build will likely fail, but that's okay. We need to add your environment variables next.

1.  Go to your new project's **Settings** > **Environment Variables**.
2.  Under **Production**, click **Add variable** and add the following four variables.

    ---

    #### Variable 1: Supabase URL
    -   **Variable name**: `NEXT_PUBLIC_SUPABASE_URL`
    -   **Value**: `https://ifdhcwsigjankvidokko.supabase.co`

    ---

    #### Variable 2: Public / Anon Key
    -   **Variable name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTc0NzcsImV4cCI6MjA4OTMzMzQ3N30.Z-H5YqGo_L0Q0mJ_N23tV11Jb6W32aA2yS3R2zDAbJI`

    ---

    #### Variable 3: Secret Service Role Key
    -   **Variable name**: `SUPABASE_SERVICE_ROLE_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NzQ3NywiZXhwIjoyMDg5MzMzNDc3fQ.WYLx7zUkc0pl_02HpM1ULXTNKi_AWeXjD8EEYBbKrJc`
    -   **Important:** Click the **Encrypt** button for this value.

    ---

    #### Variable 4: Node.js Version
    -   **Variable name**: `NODE_VERSION`
    -   **Value**: `20`
    
    > **CRITICAL:** The `NODE_VERSION` variable is essential for a successful build. Make sure it is added here, in the **Environment Variables** section, and NOT in the "Build command" field.

---

## 4. Trigger a New Deployment

After adding the variables, go to the **Deployments** tab and **retry the deployment**. This will apply your new environment variables and build the site correctly.

Your site will now be live!

---

## Supabase Database Setup

If you haven't already, run the SQL script below in your Supabase SQL Editor to set up the necessary tables and functions for the application.

```sql
-- =================================================================
-- 0. ENABLE EXTENSIONS (IMPORTANT)
-- Enable pgcrypto to ensure random code generation functions are available.
-- =================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  phone text UNIQUE,
  balance numeric(10, 2) DEFAULT 0.00,
  referral_code text UNIQUE,
  parent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  has_withdrawal_pin boolean DEFAULT false NOT NULL,
  withdrawal_locked boolean DEFAULT false NOT NULL,
  device_id text
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
-- 2. NOTE ON PROFILE CREATION
-- The trigger for automatic profile creation has been removed.
-- Profile creation is now handled explicitly in the application code
-- within the `/src/app/signup/actions.ts` file for better error handling.
-- The old trigger function can be safely removed from your database.
-- =================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


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
  image_url text,
  max_rentals integer DEFAULT 1
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
INSERT INTO public.generators (id, name, subtitle, icon, color, price, expire_days, daily_income, published, roi, period, min_invest, max_invest, investors, image_url, max_rentals)
VALUES
  ('pg1', 'PG1 Generator', 'Basic Power', '⚡', 'from-amber-400 to-orange-500', 0, 2, 0.5, true, '10%', 'Daily', '$0', '$0', '12050', 'https://picsum.photos/seed/genpg1/300/300', 1),
  ('pg2', 'PG2 Generator', 'Standard Power', '🔋', 'from-green-400 to-emerald-600', 25, 30, 2.5, true, '12%', 'Daily', '$25', '$1000', '8520', 'https://picsum.photos/seed/genpg2/300/300', 2),
  ('pg3', 'PG3 Generator', 'Mega Power', '💡', 'from-blue-400 to-indigo-600', 100, 45, 10, true, '15%', 'Daily', '$100', '$5000', '4310', 'https://picsum.photos/seed/genpg3/300/300', 1),
  ('pg4', 'PG4 Generator', 'Ultra Power', '🚀', 'from-purple-500 to-pink-600', 500, 30, 55, true, '20%', 'Daily', '$500', '$20000', '1250', 'https://picsum.photos/seed/genpg4/300/300', 2)
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
  SELECT * INTO public.gift_codes WHERE code = code_in FOR UPDATE;

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


-- =================================================================
-- 9. RPC FUNCTION FOR EARNINGS COLLECTION (IMPROVED)
-- Atomically collects earnings and resets the 24-hour timer to the current time.
-- NOTE: This function does NOT affect the generator's overall expiration date (`expires_at`),
-- which continues to count down regardless of collection activity.
-- =================================================================
CREATE OR REPLACE FUNCTION collect_earnings(rented_generator_id_in uuid, user_id_in uuid)
RETURNS numeric AS $$
DECLARE
  rented_gen_record record;
  generator_record record;
  periods_to_claim integer;
  amount_to_add numeric;
  time_since_last_claim interval;
  twenty_four_hours interval := '24 hours';
BEGIN
  -- 1. Find and lock the rented generator row for the specific user
  SELECT * INTO rented_gen_record FROM public.rented_generators 
  WHERE id = rented_generator_id_in AND user_id = user_id_in FOR UPDATE;

  -- 2. Check if the generator exists, belongs to the user, and is not suspended
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rented generator not found or you do not own it.';
  END IF;

  IF rented_gen_record.suspended THEN
    RAISE EXCEPTION 'Generator is suspended.';
  END IF;
  
  -- 3. Get the base generator details
  SELECT * INTO generator_record FROM public.generators WHERE id = rented_gen_record.generator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Base generator not found.';
  END IF;
  
  -- 4. Calculate how many 24-hour periods can be claimed
  -- Use LEAST(now(), expires_at) to prevent claiming for time after expiry
  time_since_last_claim := LEAST(now(), rented_gen_record.expires_at) - rented_gen_record.last_claimed_at;
  
  -- Check if at least 24 hours have passed
  IF time_since_last_claim < twenty_four_hours THEN
    RETURN 0; -- Not yet time to claim, return 0
  END IF;

  periods_to_claim := floor(extract(epoch from time_since_last_claim) / (24 * 60 * 60));

  IF periods_to_claim < 1 THEN
    RETURN 0; -- Not enough time, return 0
  END IF;

  -- 5. Calculate earnings using daily_income directly
  amount_to_add := periods_to_claim * generator_record.daily_income;

  -- 6. Update user's balance
  UPDATE public.profiles
  SET balance = balance + amount_to_add
  WHERE id = user_id_in;

  -- 7. IMPORTANT CHANGE: Update the last_claimed_at timestamp to the current time.
  -- This resets the 24-hour countdown timer every time a user collects, making it more intuitive.
  -- The user will lose any fractional progress towards the next cycle if they collect late,
  -- but this is a trade-off for a clearer user experience.
  UPDATE public.rented_generators
  SET last_claimed_at = now()
  WHERE id = rented_generator_id_in;
  
  -- 8. Return the amount earned
  RETURN amount_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 10. RPC FUNCTION FOR REFERRAL BONUS
-- Atomically claims the 5-referral bonus for a user.
-- =================================================================
CREATE OR REPLACE FUNCTION claim_referral_bonus(user_id_in uuid)
RETURNS numeric AS $$
DECLARE
  profile_record record;
  referral_count integer;
  bonus_code_text text;
  bonus_amount numeric := 3; -- The bonus amount
  has_paid_generator boolean;
BEGIN
  -- 1. Get user profile and lock the row
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_id_in FOR UPDATE;

  IF NOT FOUND OR profile_record.referral_code IS NULL THEN
    RAISE EXCEPTION 'User profile or referral code not found.';
  END IF;
  
  -- 2. Check if this bonus has already been claimed
  bonus_code_text := 'REF-BONUS-5-' || user_id_in::text;
  
  IF EXISTS (SELECT 1 FROM public.gift_codes WHERE code = bonus_code_text) THEN
    RAISE EXCEPTION 'You have already claimed this referral bonus.';
  END IF;

  -- 3. Count referrals
  SELECT count(*) INTO referral_count FROM public.profiles WHERE parent_id = user_id_in;

  IF referral_count < 5 THEN
    RAISE EXCEPTION 'You need at least 5 referrals to claim the bonus.';
  END IF;

  -- 4. NEW: Check if the user has at least one paid generator
  SELECT EXISTS (
    SELECT 1 FROM public.rented_generators
    WHERE user_id = user_id_in
    AND generator_id != 'pg1'
    AND expires_at > now()
  ) INTO has_paid_generator;
  
  IF NOT has_paid_generator THEN
    RAISE EXCEPTION 'You must have at least one active paid generator (PG2 or higher) to claim the referral bonus.';
  END IF;

  -- 5. Update user's balance
  UPDATE public.profiles
  SET balance = balance + bonus_amount
  WHERE id = user_id_in;

  -- 6. Log the claim in gift_codes to prevent re-claiming
  INSERT INTO public.gift_codes (code, amount, note, is_redeemed, redeemed_at, redeemed_by_user_id)
  VALUES (bonus_code_text, bonus_amount, '5-referral bonus', true, now(), user_id_in);

  -- 7. Return the amount granted
  RETURN bonus_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 11. DAILY VISITS TABLE
-- Stores a simple count of homepage views per day.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.daily_visits (
  date date NOT NULL PRIMARY KEY DEFAULT now()::date,
  view_count integer DEFAULT 1 NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.daily_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (for admin panel)
DROP POLICY IF EXISTS "Daily visits are viewable by everyone." ON public.daily_visits;
CREATE POLICY "Daily visits are viewable by everyone." ON public.daily_visits FOR SELECT USING (true);


-- =================================================================
-- 12. RPC FUNCTION FOR INCREMENTING DAILY VISITS
-- Atomically increments the view counter for the current day.
-- =================================================================
CREATE OR REPLACE FUNCTION increment_daily_visit()
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_visits (date, view_count)
  VALUES (now()::date, 1)
  ON CONFLICT (date) DO UPDATE
  SET view_count = daily_visits.view_count + 1;
END;
$$ LANGUAGE plpgsql;


-- =================================================================
-- 13. RPC FUNCTION FOR GETTING REFERRED USERS
-- Fetches the list of users referred by a specific user.
-- This bypasses RLS to allow a user to see basic info of people they referred.
-- =================================================================
CREATE OR REPLACE FUNCTION get_referred_users(user_id_in uuid)
RETURNS TABLE(id uuid, full_name text, username text, created_at timestamp with time zone) AS $$
BEGIN
  -- Return the list of users who were referred by this user
  -- NOTE: This function bypasses Row Level Security.
  RETURN QUERY
  SELECT p.id, p.full_name, p.username, p.created_at
  FROM public.profiles p
  WHERE p.parent_id = user_id_in
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 14. RPC FUNCTION FOR ATOMIC BALANCE INCREMENT
-- Atomically increments a user's balance. Used for commissions.
-- =================================================================
CREATE OR REPLACE FUNCTION increment_balance(user_id_in uuid, amount_in numeric)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount_in
  WHERE id = user_id_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 15. RPC FUNCTION FOR GETTING DOWNLINE COUNTS
-- Fetches the count of referrals up to 3 levels deep.
-- =================================================================
CREATE OR REPLACE FUNCTION get_downline_counts(user_id_in uuid)
RETURNS TABLE(level1_count bigint, level2_count bigint, level3_count bigint) AS $$
DECLARE
    l1_ids uuid[];
    l2_ids uuid[];
BEGIN
    -- Level 1
    SELECT array_agg(id) INTO l1_ids FROM public.profiles WHERE parent_id = user_id_in;
    level1_count := COALESCE(array_length(l1_ids, 1), 0);

    -- Level 2
    IF level1_count > 0 THEN
        SELECT array_agg(id) INTO l2_ids FROM public.profiles WHERE parent_id = ANY(l1_ids);
        level2_count := COALESCE(array_length(l2_ids, 1), 0);
    ELSE
        level2_count := 0;
    END IF;

    -- Level 3
    IF level2_count > 0 THEN
        SELECT count(*) INTO level3_count FROM public.profiles WHERE parent_id = ANY(l2_ids);
    ELSE
        level3_count := 0;
    END IF;

    RETURN QUERY SELECT level1_count, level2_count, level3_count;
END;
$$ LANGUAGE plpgsql;


-- =================================================================
-- 16. RPC FUNCTION FOR GETTING DOWNLINE MEMBERS
-- Fetches the list of referred users up to 3 levels deep, including their level.
-- =================================================================
CREATE OR REPLACE FUNCTION get_downline_members(user_id_in uuid)
RETURNS TABLE(level integer, id uuid, full_name text, username text, created_at timestamp with time zone) AS $$
BEGIN
    WITH RECURSIVE downline AS (
        -- Anchor member: direct referrals (Level 1)
        SELECT 
            p.id, 
            p.parent_id, 
            p.full_name, 
            p.username, 
            p.created_at, 
            1 AS level
        FROM public.profiles p
        WHERE p.parent_id = user_id_in

        UNION ALL

        -- Recursive member: subsequent levels (up to level 3)
        SELECT 
            p_child.id, 
            p_child.parent_id, 
            p_child.full_name, 
            p_child.username, 
            p_child.created_at, 
            d.level + 1
        FROM public.profiles p_child
        JOIN downline d ON p_child.parent_id = d.id
        WHERE d.level < 3 -- Stop recursion after level 3 is found
    )
    SELECT
        d.level,
        d.id,
        d.full_name,
        d.username,
        d.created_at
    FROM downline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```