-- ============================================================================
-- Flamoral Dating Platform - Migration Verification Script
-- Purpose: Verify all 40 tables and their structure
-- Usage: psql -U postgres -d flamoral_dev -f verify-migrations.sql
-- ============================================================================

\echo '========================================================================'
\echo 'Flamoral Dating Platform - Migration Verification'
\echo '========================================================================'
\echo ''

-- ============================================================================
-- SECTION 1: Database Overview
-- ============================================================================

\echo 'SECTION 1: Database Overview'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    current_database() as database_name,
    version() as postgres_version;

\echo ''

-- ============================================================================
-- SECTION 2: Table Count Verification
-- ============================================================================

\echo 'SECTION 2: Table Count Verification'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    COUNT(*) as total_tables,
    'Expected: 40 tables' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

\echo ''

-- ============================================================================
-- SECTION 3: All Tables List
-- ============================================================================

\echo 'SECTION 3: All Tables in Database'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    table_name,
    (SELECT COUNT(*)
     FROM information_schema.columns
     WHERE table_schema = 'public'
         AND table_name = t.table_name) as column_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as total_size
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

\echo ''

-- ============================================================================
-- SECTION 4: Critical Tables Verification
-- ============================================================================

\echo 'SECTION 4: Critical Tables Verification'
\echo '------------------------------------------------------------------------'
\echo ''

\echo 'Core User System (4 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '✓ users'
        ELSE '✗ users (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
        THEN '✓ profiles'
        ELSE '✗ profiles (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_tokens')
        THEN '✓ verification_tokens'
        ELSE '✗ verification_tokens (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refresh_tokens')
        THEN '✓ refresh_tokens'
        ELSE '✗ refresh_tokens (MISSING)'
    END;

\echo ''
\echo 'Content (3 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'photos')
        THEN '✓ photos'
        ELSE '✗ photos (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prompts')
        THEN '✓ prompts'
        ELSE '✗ prompts (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_prompts')
        THEN '✓ user_prompts'
        ELSE '✗ user_prompts (MISSING)'
    END;

\echo ''
\echo 'Matching Engine (3 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'swipes')
        THEN '✓ swipes'
        ELSE '✗ swipes (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matches')
        THEN '✓ matches'
        ELSE '✗ matches (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences')
        THEN '✓ user_preferences'
        ELSE '✗ user_preferences (MISSING)'
    END;

\echo ''
\echo 'Messaging (2 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations')
        THEN '✓ conversations'
        ELSE '✗ conversations (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages')
        THEN '✓ messages'
        ELSE '✗ messages (MISSING)'
    END;

\echo ''
\echo 'Monetization (9 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans')
        THEN '✓ subscription_plans'
        ELSE '✗ subscription_plans (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions')
        THEN '✓ subscriptions'
        ELSE '✗ subscriptions (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods')
        THEN '✓ payment_methods'
        ELSE '✗ payment_methods (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions')
        THEN '✓ transactions'
        ELSE '✗ transactions (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coins')
        THEN '✓ coins'
        ELSE '✗ coins (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coin_packages')
        THEN '✓ coin_packages'
        ELSE '✗ coin_packages (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coin_transactions')
        THEN '✓ coin_transactions'
        ELSE '✗ coin_transactions (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boost_products')
        THEN '✓ boost_products'
        ELSE '✗ boost_products (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boosts')
        THEN '✓ boosts'
        ELSE '✗ boosts (MISSING)'
    END;

\echo ''
\echo 'Safety (5 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_blocks')
        THEN '✓ user_blocks'
        ELSE '✗ user_blocks (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports')
        THEN '✓ reports'
        ELSE '✗ reports (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_logs')
        THEN '✓ moderation_logs'
        ELSE '✗ moderation_logs (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_violations')
        THEN '✓ user_violations'
        ELSE '✗ user_violations (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_safety_records')
        THEN '✓ user_safety_records'
        ELSE '✗ user_safety_records (MISSING)'
    END;

\echo ''
\echo 'Privacy (1 table):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'privacy_settings')
        THEN '✓ privacy_settings'
        ELSE '✗ privacy_settings (MISSING)'
    END as status;

\echo ''
\echo 'Notifications (4 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_templates')
        THEN '✓ notification_templates'
        ELSE '✗ notification_templates (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_devices')
        THEN '✓ user_devices'
        ELSE '✗ user_devices (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences')
        THEN '✓ notification_preferences'
        ELSE '✗ notification_preferences (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications')
        THEN '✓ notifications'
        ELSE '✗ notifications (MISSING)'
    END;

\echo ''
\echo 'Analytics (6 tables):'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events')
        THEN '✓ analytics_events'
        ELSE '✗ analytics_events (MISSING)'
    END as status
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_attribution')
        THEN '✓ user_attribution'
        ELSE '✗ user_attribution (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions')
        THEN '✓ user_sessions'
        ELSE '✗ user_sessions (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversion_funnel')
        THEN '✓ conversion_funnel'
        ELSE '✗ conversion_funnel (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_campaign_performance')
        THEN '✓ ad_campaign_performance'
        ELSE '✗ ad_campaign_performance (MISSING)'
    END
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'engagement_metrics')
        THEN '✓ engagement_metrics'
        ELSE '✗ engagement_metrics (MISSING)'
    END;

\echo ''

-- ============================================================================
-- SECTION 5: Index Verification
-- ============================================================================

\echo 'SECTION 5: Index Statistics'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    COUNT(*) as total_indexes,
    'Expected: 150+ indexes' as status
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''

-- ============================================================================
-- SECTION 6: Trigger Verification
-- ============================================================================

\echo 'SECTION 6: Trigger Verification'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    COUNT(*) as total_triggers,
    'Expected: 7 triggers' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public';

\echo ''
\echo 'Trigger List:'
SELECT
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event_type
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================================================
-- SECTION 7: Foreign Key Verification
-- ============================================================================

\echo 'SECTION 7: Foreign Key Verification'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    COUNT(*) as total_foreign_keys,
    'Expected: 60+ foreign keys' as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_schema = 'public';

\echo ''

-- ============================================================================
-- SECTION 8: Seeded Data Verification
-- ============================================================================

\echo 'SECTION 8: Seeded Data Verification'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    (SELECT COUNT(*) FROM subscription_plans) as subscription_plans,
    '(expected: 4)' as expected_plans,
    (SELECT COUNT(*) FROM coin_packages) as coin_packages,
    '(expected: 5)' as expected_coins,
    (SELECT COUNT(*) FROM boost_products) as boost_products,
    '(expected: 3)' as expected_boosts,
    (SELECT COUNT(*) FROM prompts) as prompts,
    '(expected: 8)' as expected_prompts,
    (SELECT COUNT(*) FROM notification_templates) as notification_templates,
    '(expected: 10)' as expected_templates;

\echo ''

-- ============================================================================
-- SECTION 9: Subscription Plans
-- ============================================================================

\echo 'SECTION 9: Subscription Plans'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    name,
    tier,
    price_monthly,
    daily_swipes,
    unlimited_likes,
    see_who_likes_you
FROM subscription_plans
ORDER BY sort_order;

\echo ''

-- ============================================================================
-- SECTION 10: Coin Packages
-- ============================================================================

\echo 'SECTION 10: Coin Packages'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    name,
    sku,
    coins,
    bonus_coins,
    price,
    is_popular
FROM coin_packages
ORDER BY sort_order;

\echo ''

-- ============================================================================
-- SECTION 11: Boost Products
-- ============================================================================

\echo 'SECTION 11: Boost Products'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    name,
    type,
    duration_minutes,
    coin_cost,
    visibility_multiplier,
    is_featured
FROM boost_products
ORDER BY sort_order;

\echo ''

-- ============================================================================
-- SECTION 12: Database Size Report
-- ============================================================================

\echo 'SECTION 12: Database Size Report'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    pg_size_pretty(pg_database_size(current_database())) as total_database_size;

\echo ''

SELECT
    schemaname,
    COUNT(*) as table_count,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as total_size
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

\echo ''

-- ============================================================================
-- SECTION 13: Extensions
-- ============================================================================

\echo 'SECTION 13: PostgreSQL Extensions'
\echo '------------------------------------------------------------------------'
\echo ''

SELECT
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname = 'pgcrypto';

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo '========================================================================'
\echo 'Verification Complete'
\echo '========================================================================'
\echo ''
\echo 'If all checks pass, your database is properly configured with:'
\echo '  - 40 tables'
\echo '  - 150+ indexes'
\echo '  - 7 triggers'
\echo '  - 60+ foreign keys'
\echo '  - 30+ rows of seeded data'
\echo ''
\echo 'Next steps:'
\echo '  1. Review any missing tables or failed checks above'
\echo '  2. Connect your application to the database'
\echo '  3. Run application-level tests'
\echo '  4. Monitor query performance'
\echo ''
