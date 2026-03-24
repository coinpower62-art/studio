# 🚨 Critical: Correct Deployment Settings

The build logs show that the deployment is failing because of an incorrect command. To fix this, you **must** use Cloudflare's standard Git-integrated deployment for Next.js projects.

**Do NOT use `npx wrangler deploy`**.

Follow these steps exactly in your Cloudflare Pages project settings:

1.  Go to **Settings** > **Builds & deployments**.
2.  Under **Build configuration**, click **Configure Production deployment**.
3.  Ensure the **Framework preset** is set to `Next.js`.
4.  The **Build command** must be `npm run build`.
5.  The **Build output directory** must be `.next`.
6.  **Most importantly: Leave the "Deployment command" field BLANK.**

Cloudflare will automatically handle the deployment correctly with these settings. Using `wrangler deploy` triggers a different, incompatible process that causes the build to fail.

---

### Standard Deployment Guide

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
