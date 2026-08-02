-- =====================================================
-- BOOSTBUDDY FRESH DATABASE INSTALLATION
-- Complete schema for new project setup
-- Run this in Supabase SQL Editor
-- Assumes no existing tables (fresh installation)
-- =====================================================

-- =====================================================
-- ENABLE UUID EXTENSION (if not already enabled)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =====================================================
-- CREATE TABLES IN DEPENDENCY ORDER
-- =====================================================

-- 1. CreditPackage (credit packages for purchase)
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ReviewCreditPricing (pricing per review type)
CREATE TABLE review_credit_pricing (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_type TEXT NOT NULL UNIQUE,
    credits_per_unit INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CreditTransaction (audit log for credit operations)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_credit_transactions_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. ReviewOrder (main review management table)
CREATE TABLE review_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    business_name TEXT,
    business_url TEXT,
    review_type TEXT NOT NULL,
    target_rating TEXT NOT NULL,
    review_content TEXT,
    review_instructions TEXT,
    proof_of_completion TEXT,
    credits_consumed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    assigned_employee_id UUID,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    admin_verification_status TEXT,
    admin_verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    order_type TEXT DEFAULT 'REVIEW',
    facebook_url TEXT,
    quantity INTEGER DEFAULT 1,
    content TEXT,
    comment_text TEXT,
    photo_urls TEXT,
    number_of_reviews INTEGER DEFAULT 1,

    CONSTRAINT fk_review_orders_client
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_orders_employee
      FOREIGN KEY (assigned_employee_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. SkippedReview (track employee skips)
CREATE TABLE skipped_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    review_order_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id, review_order_id),
    CONSTRAINT fk_skipped_reviews_employee
      FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skipped_reviews_order
      FOREIGN KEY (review_order_id) REFERENCES review_orders(id) ON DELETE CASCADE
);

-- 6. EmployeeStats (employee performance metrics)
CREATE TABLE employee_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    is_available BOOLEAN DEFAULT true,
    orders_completed INTEGER DEFAULT 0,
    orders_skipped INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_employee_stats_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 7. Notification (user notifications log)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    channels TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_link TEXT,
    related_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 8. Add columns to existing auth.users table
-- Run these separately as they modify existing table
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;

ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN DEFAULT true;

ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;


-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- CreditPackage indexes
CREATE INDEX idx_credit_packages_active ON credit_packages(is_active);

-- CreditTransaction indexes
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- ReviewOrder indexes
CREATE INDEX idx_review_orders_status ON review_orders(status);
CREATE INDEX idx_review_orders_employee ON review_orders(assigned_employee_id);
CREATE INDEX idx_review_orders_created_at ON review_orders(created_at);
CREATE INDEX idx_review_orders_assigned_at ON review_orders(assigned_at);
CREATE INDEX idx_review_orders_admin_verification ON review_orders(admin_verification_status);
CREATE INDEX idx_review_orders_user ON review_orders(user_id);
CREATE INDEX idx_review_orders_client ON review_orders(user_id);

-- SkippedReview indexes
CREATE INDEX idx_skipped_reviews_review_order ON skipped_reviews(review_order_id);
CREATE INDEX idx_skipped_reviews_employee ON skipped_reviews(employee_id);

-- EmployeeStats indexes
CREATE INDEX idx_employee_stats_available ON employee_stats(is_available);
CREATE INDEX idx_employee_stats_performance ON employee_stats(orders_completed, orders_skipped);

-- Notification indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);


-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default pricing for review types
INSERT INTO review_credit_pricing (order_type, credits_per_unit)
VALUES
  ('REVIEW', 15),
  ('COMMENT', 10),
  ('COMMENT_WITH_PHOTO', 20);

-- Default credit packages (optional - customize as needed)
INSERT INTO credit_packages (name, description, credits_amount, price)
VALUES
  ('Starter Pack', '100 credits for small businesses', 100, 29.00),
  ('Professional Pack', '500 credits for growing businesses', 500, 99.00),
  ('Enterprise Pack', '2000 credits for large operations', 2000, 299.00);


-- =====================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: User with credits balance
CREATE VIEW users_with_credits AS
SELECT
    u.id,
    u.email,
    u.name,
    u.role,
    u.credits_balance,
    u.accepting_orders,
    u.telegram_chat_id,
    es.is_available,
    es.orders_completed,
    es.orders_skipped
FROM auth.users u
LEFT JOIN employee_stats es ON u.id = es.user_id;

-- View: Review orders with client and employee details
CREATE VIEW review_orders_details AS
SELECT
    ro.id,
    ro.business_name,
    ro.review_type,
    ro.target_rating,
    ro.status,
    ro.admin_verification_status,
    ro.created_at,
    ro.completed_at,
    client.id as client_id,
    client.email as client_email,
    client.name as client_name,
    employee.id as employee_id,
    employee.email as employee_email,
    employee.name as employee_name
FROM review_orders ro
LEFT JOIN auth.users client ON ro.user_id = client.id
LEFT JOIN auth.users employee ON ro.assigned_employee_id = employee.id;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables created successfully
SELECT 'Table Creation Check' as check_type;
SELECT
    'credit_packages' as table_name,
    COUNT(*) as row_count
FROM credit_packages
UNION ALL
SELECT 'review_credit_pricing', COUNT(*) FROM review_credit_pricing
UNION ALL
SELECT 'credit_transactions', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'review_orders', COUNT(*) FROM review_orders
UNION ALL
SELECT 'skipped_reviews', COUNT(*) FROM skipped_reviews
UNION ALL
SELECT 'employee_stats', COUNT(*) FROM employee_stats
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- Check if default data inserted correctly
SELECT 'Default Data Check' as check_type;
SELECT * FROM review_credit_pricing;
SELECT * FROM credit_packages;

-- Test foreign key relationships
SELECT 'Foreign Key Test' as check_type;
SELECT
    u.id,
    u.email,
    u.credits_balance,
    es.user_id as has_stats
FROM auth.users u
LEFT JOIN employee_stats es ON u.id = es.user_id
LIMIT 5;


-- =====================================================
-- GRANT PERMISSIONS (if needed for service role)
-- =====================================================
-- Uncomment if you need to grant permissions to service role
/*
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
*/

-- =====================================================
-- DATABASE INSTALLATION COMPLETE
-- All tables, indexes, views, and default data created
-- System ready for use
-- =====================================================