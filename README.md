# 🚀 CoinPower Deployment Guide for Netlify

> **IMPORTANT:** Before deploying, ensure you have run the database setup SQL provided in your Supabase SQL Editor. This is a one-time setup required for all app features to work correctly.

This project is configured exclusively for deployment on **Netlify**.

---

## 🚨 Critical: Connecting Supabase to Netlify

For your live app to function correctly, you **must** add your Supabase keys to your Netlify site's environment variables.

### Step-by-Step Instructions:

1.  **Log in to Netlify** and go to your Site configuration.
2.  Navigate to **Site settings** > **Environment variables**.
3.  Click **Add a variable** > **Import from a .env file** (or add them individually). You need to add these four variables:

    ---

    #### Variable 1: Supabase URL
    -   **Key**: `NEXT_PUBLIC_SUPABASE_URL`
    -   **Value**: Found in Supabase Settings > API

    ---

    #### Variable 2: Public / Anon Key
    -   **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   **Value**: Found in Supabase Settings > API (anon public)

    ---

    #### Variable 3: Secret Service Role Key
    -   **Key**: `SUPABASE_SERVICE_ROLE_KEY`
    -   **Value**: Found in Supabase Settings > API (service_role)
    -   **Important:** This key is used for admin actions and bypassing RLS.

    ---

    #### Variable 4: Node Version
    -   **Key**: `NODE_VERSION`
    -   **Value**: `20`

    ---

4.  **Trigger a New Deploy.** After saving the variables, go to the "Deploys" tab and click "Trigger deploy" to apply the changes.

---

## Supabase Database Setup

Ensure all tables (`profiles`, `generators`, `rented_generators`, `deposit_requests`, `withdrawal_requests`, `gift_codes`, `media`, `daily_visits`) are created in your Supabase project.
