# 🚀 CoinPower Deployment Guide for Netlify

> **IMPORTANT:** Before deploying, ensure you have run the database setup SQL provided in your Supabase SQL Editor. This is a one-time setup required for all app features to work correctly.

This guide provides instructions for deploying and redeploying your CoinPower application to **Netlify**.

---

## 🚨 Critical: Environment Variables

For your live app to function correctly, you **must** copy your Supabase keys into your Netlify site settings.

### Step-by-Step Instructions:

1.  **Log in to Netlify** and go to your Site Dashboard.
2.  Go to **Site configuration** > **Environment variables**.
3.  Click **Add a variable** > **Import from .env** or add them individually:

    -   `NEXT_PUBLIC_SUPABASE_URL`: `https://ifdhcwsigjankvidokko.supabase.co`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTc0NzcsImV4cCI6MjA4OTMzMzQ3N30.Z-H5YqGo_L0Q0mJ_N23tV11Jb6W32aA2yS3R2zDAbJI`
    -   `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGhjd3NpZ2phbmt2aWRva2tvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NzQ3NywiZXhwIjoyMDg5MzMzNDc3fQ.WYLx7zUkc0pl_02HpM1ULXTNKi_AWeXjD8EEYBbKrJc`
    -   `NODE_VERSION`: `20`

---

## 🔄 How to Redeploy

There are two ways to redeploy your site whenever you make changes:

### 1. Automatic Redeploy (Recommended)
Simply push your code changes to your GitHub repository:
```bash
git add .
git commit -m "update: latest features"
git push origin main
```
Netlify will detect the push and automatically start a new build and deploy.

### 2. Manual Redeploy (Netlify UI)
1. Go to your **Netlify Dashboard**.
2. Click on the **Deploys** tab.
3. Click the **Trigger deploy** dropdown menu.
4. Select **Clear cache and deploy site**. This ensures all latest changes are built fresh.

---

## 📱 Android App Build

If you plan to build the Android app bundle using GitHub Actions:

1. Open `.github/workflows/build-android.yml`.
2. Replace `YOUR_NETLIFY_APP_URL` with your actual Netlify URL (e.g., `https://coinpower-italy.netlify.app`).

---

## Supabase Database Setup

Ensure you have executed the full SQL script provided in the project instructions within your Supabase SQL Editor to set up the necessary tables (profiles, generators, rented_generators, etc.) and the PG2 limit trigger.
