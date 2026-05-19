# 🚀 CoinPower Deployment Guide for Netlify

> **IMPORTANT:** Before deploying, ensure you have run the database setup SQL provided below in your Supabase SQL Editor. This is a one-time setup required for all app features to work correctly.

This guide provides instructions for deploying your CoinPower application to Netlify.

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
    -   **Value**: `https://ifdhcwsigjankvidokko.supabase.co`

    ---

    #### Variable 2: Public / Anon Key
    -   **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTc0NzcsImV4cCI6MjA4OTMzMzQ3N30.Z-H5YqGo_L0Q0mJ_N23tV11Jb6W32aA2yS3R2zDAbJI`

    ---

    #### Variable 3: Secret Service Role Key
    -   **Key**: `SUPABASE_SERVICE_ROLE_KEY`
    -   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NzQ3NywiZXhwIjoyMDg5MzMzNDc3fQ.WYLx7zUkc0pl_02HpM1ULXTNKi_AWeXjD8EEYBbKrJc`
    -   **Important:** This key is used for admin actions.

    ---

    #### Variable 4: Node Version
    -   **Key**: `NODE_VERSION`
    -   **Value**: `20`

    ---

4.  **Trigger a New Deploy.** After saving the variables, go to the "Deploys" tab and click "Trigger deploy" to apply the changes.

---

## Supabase Database Setup

Run the SQL provided in the project files (or in `src/README.md`) in your Supabase SQL Editor to set up the necessary tables and policies.
