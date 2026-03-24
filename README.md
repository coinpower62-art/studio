# 🚀 CoinPower Deployment Guide

Congratulations on getting your CoinPower application running! This guide provides two primary methods for deploying your project to Cloudflare.

---

### Method 1: Cloudflare Pages with Git (Recommended)

This is the simplest and most reliable method for deploying Next.js applications. It automates the entire build and deployment process whenever you push new code to your repository.

#### 🚨 Critical: Correct Deployment Settings

For this method to work, you **must** use Cloudflare's standard Git-integrated deployment for Next.js projects.

**Do NOT use `npx wrangler deploy` with this method.**

Follow these steps exactly in your Cloudflare Pages project settings:

1.  Go to **Settings** > **Builds & deployments**.
2.  Under **Build configuration**, click **Configure Production deployment**.
3.  Ensure the **Framework preset** is set to `Next.js`.
4.  The **Build command** must be `npm run build`.
5.  The **Build output directory** must be `.next`.
6.  **Most importantly: Leave the "Deployment command" field BLANK.** Cloudflare handles this automatically.

#### Full Pages Deployment Guide

1.  **Push your code** to a GitHub, GitLab, or Bitbucket repository.
2.  **In the Cloudflare dashboard**, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3.  **Select your repository** and configure your build settings as described in the critical warning above.
4.  **Set Environment Variables**:
    -   Go to your project's **Settings** > **Environment variables**.
    -   Add the following variables from your `.env.local` file:
        -   `NEXT_PUBLIC_SUPABASE_URL`
        -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        -   `SUPABASE_SERVICE_ROLE_KEY`
    -   **Important**: For the admin panel to function correctly, set `SUPABASE_SERVICE_ROLE_KEY` as a **Secret** variable. The other two can be plain text.
5.  **Deploy**: Click **Save and Deploy**. Your site will be built and deployed correctly.

---

### Method 2: Cloudflare Workers with `wrangler` (Advanced)

This method deploys your application as a standalone Worker using the `wrangler` command-line tool. This is the method you have successfully used.

1.  **Set up `wrangler.toml`**: Ensure the `wrangler.toml` file in your project root is configured with your Cloudflare `account_id`.
2.  **Set Secrets**: Your Supabase keys must be set as secrets so the worker can access them. Run these commands in your terminal, replacing the placeholder values with your actual keys:
    ```bash
    npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
    # Paste your URL when prompted and press Enter

    npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
    # Paste your anon key when prompted and press Enter

    npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
    # Paste your service role key when prompted and press Enter
    ```
3.  **Deploy**: Run the deployment script. This command will build your Next.js app and deploy it using the configuration in `wrangler.toml`.
    ```bash
    npm run deploy
    ```

Your application is now live! Congratulations again.
