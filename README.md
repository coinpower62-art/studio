# 🚀 CoinPower Deployment Guide

This guide provides clear instructions for deploying your CoinPower application to Cloudflare. The key to a successful deployment is correctly configuring your environment variables.

---

## 🚨 Critical: Setting Environment Variables in Cloudflare

For your app to connect to the Supabase database, you **must** configure your environment variables in the Cloudflare dashboard. Forgetting this step is the most common cause of errors on a live site.

**This applies to both Cloudflare Pages and Cloudflare Workers deployments.**

1.  In your Cloudflare project, go to **Settings** > **Variables**.
2.  Under **Environment Variables**, click **Add variable**. Add the following two variables as plain text:
    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3.  Under **Encrypted Environment Variables**, click **Add variable**. Add your service key as a secret:
    -   `SUPABASE_SERVICE_ROLE_KEY` (Click the "Encrypt" button to save it securely)

**Why the difference?**
-   `NEXT_PUBLIC_` variables are needed by the browser (client-side code) to show things like your logo. They must be plain text variables.
-   `SUPABASE_SERVICE_ROLE_KEY` is a powerful secret for your server only. It must be encrypted.

After adding these three variables, **re-deploy your project** to apply the changes.

---

### Deployment Method 1: Cloudflare Pages

This is the recommended method for most Next.js projects.

1.  **Connect to Git**: In the Cloudflare dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2.  **Configure Build**:
    -   Select `Next.js` as the **Framework preset**.
    -   **Build command**: `npm run build`
    -   **Build output directory**: `.next`
    -   **Important**: Leave the "Deployment command" field **blank**.
3.  **Add Environment Variables**: Follow the critical instructions at the top of this guide.
4.  **Deploy**: Click **Save and Deploy**.

---

### Deployment Method 2: Cloudflare Workers (Advanced)

This method uses the `wrangler` command-line tool. This is the method you have successfully used.

1.  **Configure `wrangler.toml`**: Make sure your `wrangler.toml` file is configured for your account.
2.  **Add Environment Variables**: Follow the critical instructions at the top of this guide using the Cloudflare dashboard. Using the dashboard is recommended over the CLI for this step to ensure you correctly distinguish between plain text variables and secrets.
3.  **Deploy**: Run the deployment script from your `package.json`.
    ```bash
    npm run deploy
    