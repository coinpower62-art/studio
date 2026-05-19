# CoinPower Project

This is a Next.js starter app built with Supabase and shadcn/ui, configured for deployment on **Netlify**.

## 🚨 Troubleshooting: 'Internal Server Error'

If your deployment on Netlify builds successfully but you see an "Internal Server Error," it almost always means you have not correctly set your Supabase environment variables in your Netlify Site Settings.

**To fix this, you must:**

1.  Go to your Netlify dashboard and navigate to your Site.
2.  Go to **Site settings** > **Environment variables**.
3.  Add the following variables:
    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   `SUPABASE_SERVICE_ROLE_KEY`
    -   `NODE_VERSION` (set to `20`)
4.  Trigger a new deploy to apply the changes.

---

## Local Development

1.  **Create a `.env.local` file** by making a copy of the `.env` file.
2.  **Run the development server**:
    ```bash
    npm run dev
    ```

Your app should now be running on [http://localhost:9002](http://localhost:9002).
