-- This script creates a new function in your Supabase database.
-- This function is required for the multi-level referral system to work correctly.
-- Please copy this entire script and run it once in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION get_referral_team_details(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    user_referral_code text;
BEGIN
    -- Get the referral code of the user for whom we are fetching the team
    SELECT referral_code INTO user_referral_code FROM public.profiles WHERE id = p_user_id;

    IF user_referral_code IS NULL THEN
        return '[]'::jsonb;
    END IF;

    RETURN (
        WITH RECURSIVE referral_chain AS (
            -- Base case: Direct referrals (Level 1)
            SELECT
                id,
                full_name,
                username,
                created_at,
                referral_code,
                1 AS referral_level
            FROM public.profiles
            WHERE referred_by = user_referral_code

            UNION ALL

            -- Recursive step: Find referrals of referrals
            SELECT
                p.id,
                p.full_name,
                p.username,
                p.created_at,
                p.referral_code,
                rc.referral_level + 1
            FROM public.profiles p
            JOIN referral_chain rc ON p.referred_by = rc.referral_code
            WHERE rc.referral_level < 3 -- Go up to 3 levels deep
        ),
        -- Get rentals and calculate commission for each user in the chain
        team_details AS (
            SELECT
                rc.id AS user_id,
                rc.full_name,
                rc.username,
                rc.created_at,
                rc.referral_level,
                -- Aggregate rental information into a JSON array
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'generator_name', g.name,
                            'rental_price', g.price,
                            'commission_earned',
                                CASE rc.referral_level
                                    WHEN 1 THEN g.price * 0.10 -- 10% for level 1
                                    WHEN 2 THEN g.price * 0.05 -- 5% for level 2
                                    WHEN 3 THEN g.price * 0.02 -- 2% for level 3
                                    ELSE 0
                                END,
                            'rented_at', rg.rented_at
                        )
                    ) FILTER (WHERE g.id IS NOT NULL), -- Only aggregate if there's a rental
                    '[]'::jsonb
                ) AS rentals
            FROM referral_chain rc
            LEFT JOIN public.rented_generators rg ON rc.id = rg.user_id
            LEFT JOIN public.generators g ON rg.generator_id = g.id
            GROUP BY rc.id, rc.full_name, rc.username, rc.created_at, rc.referral_level
        )
        -- Finally, aggregate all team members into a single JSON array
        SELECT COALESCE(jsonb_agg(td.*), '[]'::jsonb)
        FROM team_details td
    );
END;
$$ LANGUAGE plpgsql;
