# Firebase Studio

This is a NextJS starter app built with Supabase and shadcn/ui.

## Getting Started

To get started with your local development environment, your Supabase credentials have been added to the `.env` file.

1.  **Add your Supabase Anon Key** to the `.env` file where it says `YOUR_SUPABASE_ANON_KEY`. You can find this in your Supabase project's API settings.

2.  **Create a `.env.local` file** by making a copy of the `.env` file in the root of the project. This will load the environment variables for your local development.

    ```bash
    cp .env .env.local
    ```

3.  **Run the development server**:

    ```bash
    npm run dev
    ```

Your app should now be running on [http://localhost:9002](http://localhost:9002).
