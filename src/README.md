# CoinPower Project - Netlify Configuration

This application is built with Next.js and Supabase, specifically optimized for **Netlify**.

## 🚨 Deployment Requirements

To avoid "Internal Server Error" or "Not Responding" messages on your live site, you must configure the following environment variables in your Netlify dashboard:

1.  `NEXT_PUBLIC_SUPABASE_URL`
2.  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3.  `SUPABASE_SERVICE_ROLE_KEY` (Required for Admin Dashboard)
4.  `NODE_VERSION` set to `20`

## Local Development

1.  Install dependencies: `npm install`
2.  Create a `.env.local` file with your keys.
3.  Run the development server: `npm run dev`

Your app will be available at [http://localhost:3000](http://localhost:3000).
