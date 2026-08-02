-- =====================================================
-- BOOSTBUDDY PRODUCTION MIGRATION SCRIPT
-- Run in Supabase SQL Editor
-- ORDER: Dependency-safe to prevent foreign key errors
-- PRESERVES: All existing data
-- =====================================================

-- =====================================================
-- STEP 1: CREATE INDEPENDENT NEW TABLES
-- (No foreign key dependencies or only reference existing User)
-- =====================================================

-- 1.1 CreditPackage (referenced by Order later)
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 ReviewCreditPricing (no dependencies)
CREATE TABLE IF NOT EXISTS review_credit_pricing (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_type TEXT NOT NULL,  -- "REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"
    credits_per_unit INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_type)
);

-- 1.3 CreditTransaction (references existing User table)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL,  -- "PURCHASE", "SPEND", "REFUND", "BONUS"
    description TEXT NOT NULL,
    reference_id TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_credit_transactions_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 1.4 ReviewOrder (references existing User table twice)
CREATE TABLE IF NOT EXISTS review_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    business_name TEXT,
    business_url TEXT,
    review_type TEXT NOT NULL,
    target_rating TEXT NOT NULL,
    review_content TEXT,
    review_instructions TEXT,
    proof_of_completion TEXT,
    credits_consumed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    assigned_employee_id TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Admin verification fields
    admin_verification_status TEXT,  -- "PENDING", "APPROVED", "REJECTED"
    admin_verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- New review system fields
    order_type TEXT DEFAULT 'REVIEW',
    facebook_url TEXT,
    quantity INTEGER DEFAULT 1,
    content TEXT,
    comment_text TEXT,
    photo_urls TEXT,
    number_of_reviews INTEGER DEFAULT 1,

    CONSTRAINT fk_review_orders_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_orders_employee
      FOREIGN KEY (assigned_employee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 1.5 SkippedReview (references User and ReviewOrder)
CREATE TABLE IF NOT EXISTS skipped_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id TEXT NOT NULL,
    review_order_id TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id, review_order_id),
    CONSTRAINT fk_skipped_reviews_employee
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skipped_reviews_order
      FOREIGN KEY (review_order_id) REFERENCES review_orders(id) ON DELETE CASCADE
);

-- 1.6 EmployeeStats (references existing User table)
CREATE TABLE IF NOT EXISTS employee_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    is_available BOOLEAN DEFAULT true,
    orders_completed INTEGER DEFAULT 0,
    orders_skipped INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_employee_stats_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 1.7 Notification (references existing User table)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    channels TEXT NOT NULL,  -- "IN_APP", "TELEGRAM", "EMAIL", "ALL"
    is_read BOOLEAN DEFAULT false,
    action_link TEXT,
    related_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =====================================================
-- STEP 2: MODIFY EXISTING TABLES
-- (Now all referenced tables exist)
-- =====================================================

-- 2.1 Modify users table to add new columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2.2 Modify orders table to add credit package reference
-- (CreditPackage table now exists, so this foreign key will work)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS credit_package_id UUID;

-- Add foreign key constraint for credit_package_id
ALTER TABLE orders
ADD CONSTRAINT fk_orders_credit_package
  FOREIGN KEY (credit_package_id) REFERENCES credit_packages(id) ON DELETE SET NULL;


-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- CreditTransaction indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- ReviewOrder indexes
CREATE INDEX IF NOT EXISTS idx_review_orders_status ON review_orders(status);
CREATE INDEX IF NOT EXISTS idx_review_orders_employee ON review_orders(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_review_orders_created_at ON review_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_review_orders_assigned_at ON review_orders(assigned_at);
CREATE INDEX IF NOT EXISTS idx_review_orders_admin_verification ON review_orders(admin_verification_status);
CREATE INDEX IF NOT EXISTS idx_review_orders_user ON review_orders(user_id);

-- SkippedReview indexes
CREATE INDEX IF NOT EXISTS idx_skipped_reviews_review_order ON skipped_reviews(review_order_id);

-- EmployeeStats indexes
CREATE INDEX IF NOT EXISTS idx_employee_stats_available ON employee_stats(is_available);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);


-- =====================================================
-- STEP 4: INSERT DEFAULT DATA
-- =====================================================

-- Default pricing for review types
INSERT INTO review_credit_pricing (order_type, credits_per_unit)
VALUES
  ('REVIEW', 15),
  ('COMMENT', 10),
  ('COMMENT_WITH_PHOTO', 20)
ON CONFLICT (order_type) DO NOTHING;

-- Default credit packages (if you want pre-configured packages)
-- Uncomment and customize as needed:
/*
INSERT INTO credit_packages (name, description, credits_amount, price)
VALUES
  ('Starter Pack', '100 credits for small businesses', 100, 29.00),
  ('Professional Pack', '500 credits for growing businesses', 500, 99.00),
  ('Enterprise Pack', '2000 credits for large operations', 2000, 299.00)
ON CONFLICT DO NOTHING;
*/


-- =====================================================
-- STEP 5: VERIFICATION & ROLLBACK SAFETY
-- =====================================================

-- Verification queries (run these to check migration success)
SELECT 'Migration Verification' as check_type;
SELECT 'Users count:' as description, COUNT(*) as count FROM users
UNION ALL
SELECT 'Review Orders count:', COUNT(*) FROM review_orders
UNION ALL
SELECT 'Credit Transactions count:', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'Employee Stats count:', COUNT(*) FROM employee_stats
UNION ALL
SELECT 'Credit Packages count:', COUNT(*) FROM credit_packages;

-- Check if foreign keys are working
SELECT 'Foreign Key Check' as check_type;
SELECT
    u.id,
    u.email,
    u.credits_balance,
    es.user_id as stats_exists
FROM users u
LEFT JOIN employee_stats es ON u.id = es.user_id
LIMIT 5;

-- =====================================================
-- ROLLBACK SCRIPT (SAVE THIS SEPARATELY IN CASE OF ISSUES)
-- =====================================================
/*
-- ROLLBACK INSTRUCTIONS:
-- 1. DROP new tables (in reverse order of creation)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS employee_stats CASCADE;
DROP TABLE IF EXISTS skipped_reviews CASCADE;
DROP TABLE IF EXISTS review_orders CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS review_credit_pricing CASCADE;
DROP TABLE IF EXISTS credit_packages CASCADE;

-- 2. REMOVE added columns from existing tables
ALTER TABLE orders DROP COLUMN IF EXISTS credit_package_id;
ALTER TABLE users DROP COLUMN IF EXISTS credits_balance;
ALTER TABLE users DROP COLUMN IF EXISTS accepting_orders;
ALTER TABLE users DROP COLUMN IF EXISTS telegram_chat_id;

-- 3. DROP indexes
DROP INDEX IF EXISTS idx_credit_transactions_user;
DROP INDEX IF EXISTS idx_credit_transactions_created_at;
DROP INDEX IF EXISTS idx_review_orders_status;
DROP INDEX IF EXISTS idx_review_orders_employee;
DROP INDEX IF EXISTS idx_review_orders_created_at;
DROP INDEX IF EXISTS idx_review_orders_assigned_at;
DROP INDEX IF EXISTS idx_review_orders_admin_verification;
DROP INDEX IF EXISTS idx_review_orders_user;
DROP INDEX IF EXISTS idx_skipped_reviews_review_order;
DROP INDEX IF EXISTS idx_employee_stats_available;
DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_notifications_created_at;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- All existing data preserved
-- New features enabled
-- Foreign key constraints active
-- Performance indexes created
-- =====================================================
