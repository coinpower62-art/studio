# CoinPower Project - Netlify Deployment

This application is built with Next.js and Supabase, optimized for deployment on **Netlify**.

## 🚀 Quick Redeploy Instructions

### Automatic
Push your changes to the `main` branch of your connected Git repository. Netlify will build and deploy automatically.

### Manual
1. Open the **Netlify UI**.
2. Navigate to **Deploys**.
3. Select **Trigger deploy** > **Clear cache and deploy site**.

## 🚨 Required Environment Variables

Ensure these are set in **Netlify Site Configuration > Environment variables**:

1.  `NEXT_PUBLIC_SUPABASE_URL`
2.  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3.  `SUPABASE_SERVICE_ROLE_KEY` (Required for Admin Dashboard)
4.  `NODE_VERSION`: `20`

## 🛠 Local Development

1.  Install dependencies: `npm install`
2.  Add keys to `.env.local`
3.  Run: `npm run dev`
