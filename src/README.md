# 🚀 CoinPower Deployment Guide for Cloudflare Pages

This guide provides step-by-step instructions for deploying your CoinPower application to Cloudflare Pages.

---

## 1. Connect Your GitHub Repository

1.  Log in to your Cloudflare dashboard.
2.  Go to **Workers & Pages** and click **Create application**.
3.  Select the **Pages** tab and click **Connect to Git**.
4.  Choose the GitHub repository for your CoinPower project and click **Begin setup**.

---

## 2. Add Environment Variables (Critical Step)

This is the most important step to ensure your application can connect to the database. On the "Set up builds and deployments" screen, before clicking "Save and Deploy", you must add your Supabase credentials.

1.  Scroll down to the **Environment Variables (advanced)** section.
2.  Click **Add variable** for each of the four variables below.

> **CRITICAL:** Double-check that you have copied these values exactly. Even a small typo will cause your application to fail.

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
    
---

## 3. Configure Your Build Settings

Now, scroll back up to the **Build settings** section and ensure they are set as follows:

-   **Framework preset**: `Next.js`
-   **Build command**: `npx @cloudflare/next-on-pages@1`
-   **Build output directory**: `.vercel/output/static`

---

## 4. Deploy

Click **Save and Deploy**. Your application should now build and deploy successfully.

Your site will be live!

## Local Development

1.  **Create a `.env.local` file** by making a copy of the `.env` file.
2.  **Run the development server**:
    ```bash
    npm run dev
    ```

Your app should now be running on [http://localhost:3000](http://localhost:3000).

## Supabase Database Setup

Run the SQL script found in the root `README.md` file in your Supabase SQL Editor to set up the necessary tables and functions.
