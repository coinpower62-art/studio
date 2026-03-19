# Firebase Studio

This is a NextJS starter app built with Supabase and shadcn/ui.

## Getting Started

To get started with your local development environment, you'll need to configure your Supabase credentials.

1.  **Create a `.env.local` file** by making a copy of the `.env` file in the root of the project.
2.  **Add your Supabase credentials** to the `.env.local` file. You can find your Project URL and anon key in your Supabase project's API settings.

    ```bash
    NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
    ```

3.  **Run the development server**:

    ```bash
    npm run dev
    ```

Your app should now be running on [http://localhost:9002](http://localhost:9002).