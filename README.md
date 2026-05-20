# 🚀 CoinPower Deployment Guide for Netlify

> **IMPORTANT:** Before deploying, ensure you have run the database setup SQL provided in your Supabase SQL Editor. This is a one-time setup required for all app features to work correctly.

This guide provides instructions for deploying your CoinPower application to Netlify.

---

## 🚨 Critical: Connecting Supabase to Cloudflare Pages

For your live app to function correctly, you **must** copy your Supabase keys into your Cloudflare Pages project's settings. This allows your deployment to connect to your Supabase database.

### Step-by-Step Instructions:

1.  **Log in to Cloudflare** and go to your Pages project dashboard.
2.  Go to **Settings** > **Environment variables**.
3.  Under **Production**, click **Add variable**. You will need to add four variables.

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

    #### Variable 4: Node.js Version
    -   **Variable name**: `NODE_VERSION`
    -   **Value**: `20`

---

4.  **Trigger a New Deployment.** After adding the variables, go to the "Deployments" tab and trigger a new deployment. This will apply the new environment variables and build your site.

**Why is this necessary?**
- Your **public** keys (`NEXT_PUBLIC_...`) are used by the browser to fetch data securely.
- Your **secret** key (`SUPABASE_SERVICE_ROLE_KEY`) is used by the server-side part of your app to perform administrative tasks. It must be kept secret.
- `NODE_VERSION` ensures Cloudflare uses a compatible version of Node.js to build your app.

By following these steps, your app will be able to communicate with your Supabase database, and all features, including the Admin Panel, will work correctly.

---

## 📱 Android App Build (Optional)

If you plan to build the Android app bundle using the provided GitHub Actions workflow, you must update the deployment URL in the workflow file.

1. Open the file `.github/workflows/build-android.yml`.
2. Find the line with `bubblewrap init --manifest=...`.
3. Replace `https://YOUR_CLOUDFLARE_URL/manifest.json` with your actual Cloudflare Pages URL (e.g., `https://your-project.pages.dev/manifest.json`).

---

## Supabase Database Setup

Run the SQL provided in the project files (or in `src/README.md`) in your Supabase SQL Editor to set up the necessary tables and policies.
