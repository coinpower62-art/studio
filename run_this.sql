-- Fix historical referral data by converting to uppercase
UPDATE public.profiles SET referred_by = UPPER(referred_by) WHERE referred_by IS NOT NULL;
UPDATE public.profiles SET referral_code = UPPER(referral_code) WHERE referral_code IS NOT NULL;

-- Recreate the function to be case-insensitive
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
            UPPER(p.referred_by) = (SELECT UPPER(referral_code) FROM public.profiles WHERE id = p_user_id)

        UNION ALL

        -- Recursive step: referrals of referrals (Levels 2 and 3)
        SELECT
            p_child.id,
            p_child.referral_code,
            rc.level + 1
        FROM
            public.profiles p_child
        JOIN
            referral_chain rc ON UPPER(p_child.referred_by) = UPPER(rc.referral_code)
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
