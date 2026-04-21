-- This script creates a database function to fetch a user's multi-level referral team (up to 3 levels)
-- and calculate the commission earned from each subordinate's generator rentals.
--
-- How it works:
-- 1. It uses a recursive query (WITH RECURSIVE) to traverse the referral chain.
-- 2. It calculates the commission based on the referral level (10% for L1, 5% for L2, 2% for L3).
-- 3. It aggregates the data into a clean JSON structure for the application to display.
--
-- Run this entire script once in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION get_referral_team_details(p_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    username text,
    created_at timestamptz,
    referral_level integer,
    rentals jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        -- Base case: direct referrals (Level 1)
        SELECT
            p.id,
            p.referral_code,
            1 AS level
        FROM
            public.profiles p
        WHERE
            p.referred_by = (SELECT referral_code FROM public.profiles WHERE id = p_user_id)

        UNION ALL

        -- Recursive step: referrals of referrals (Levels 2 and 3)
        SELECT
            p.id,
            p.referral_code,
            rc.level + 1
        FROM
            public.profiles p
        JOIN
            referral_chain rc ON p.referred_by = rc.referral_code
        WHERE
            rc.level < 3
    )
    SELECT
        rc.id AS user_id,
        p.full_name,
        p.username,
        p.created_at,
        rc.level AS referral_level,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'generator_name', g.name,
                        'rental_price', g.price,
                        'commission_earned',
                            CASE
                                WHEN rc.level = 1 THEN g.price * 0.10
                                WHEN rc.level = 2 THEN g.price * 0.05
                                WHEN rc.level = 3 THEN g.price * 0.02
                                ELSE 0
                            END,
                        'rented_at', rg.rented_at
                    )
                )
                FROM public.rented_generators rg
                JOIN public.generators g ON rg.generator_id = g.id
                WHERE rg.user_id = rc.id AND g.price > 0
            ),
            '[]'::jsonb
        ) AS rentals
    FROM
        referral_chain rc
    JOIN
        public.profiles p ON rc.id = p.id;
END;
$$ LANGUAGE plpgsql;
