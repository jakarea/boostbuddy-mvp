-- ============================================
-- REVIEWS SYSTEM REDESIGN - DATABASE MIGRATION
-- ============================================
-- Date: 2025-01-06
-- Description: Multi-URL support, Employee Earnings System, Task Distribution Control
--
-- INSTRUCTIONS:
-- 1. Run this in Supabase SQL Editor
-- 2. Review each section before executing
-- 3. Migration includes data migration for existing orders
-- ============================================

-- ============================================
-- SECTION 1: CREATE NEW TABLES
-- ============================================

-- 1.1 Create ReviewUrl model (Multi-URL support)
-- This allows a single order to have multiple URLs, each as a separate task
CREATE TABLE review_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_order_id UUID NOT NULL REFERENCES review_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  review_content TEXT,
  review_index INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  assigned_employee_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  completed_at TIMESTAMP,
  proof_of_completion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ReviewUrl
CREATE INDEX review_urls_status ON review_urls(status);
CREATE INDEX review_urls_employee ON review_urls(assigned_employee_id);
CREATE INDEX review_urls_order ON review_urls(review_order_id);

-- 1.2 Create EmployeeEarnings model (Employee Wallet)
-- Tracks employee earnings, balance, and payout information
CREATE TABLE employee_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  current_period_earned DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  payout_method VARCHAR(50),
  payout_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for EmployeeEarnings
CREATE INDEX employee_earnings_status ON employee_earnings(status);
CREATE INDEX employee_earnings_user ON employee_earnings(user_id);

-- 1.3 Create EmployeeEarningTransaction model (Transaction Ledger)
-- Records all earnings transactions for audit trail
CREATE TABLE employee_earning_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_earnings_id UUID NOT NULL REFERENCES employee_earnings(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  reference_order_id UUID,
  reference_type VARCHAR(50),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for EmployeeEarningTransaction
CREATE INDEX earning_transactions_earnings ON employee_earning_transactions(employee_earnings_id);
CREATE INDEX earning_transactions_created ON employee_earning_transactions(created_at);
CREATE INDEX earning_transactions_type ON employee_earning_transactions(type);

-- 1.4 Create EmployeeEarningRule model (Payment Rules Configuration)
-- Allows admin to configure payment amounts per review type
CREATE TABLE employee_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type VARCHAR(50) NOT NULL,
  review_type VARCHAR(50),
  reaction_type VARCHAR(20),
  payment_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for EmployeeEarningRule
CREATE INDEX earning_rules_active ON employee_earning_rules(is_active);
CREATE INDEX earning_rules_priority ON employee_earning_rules(priority);
CREATE INDEX earning_rules_order_type ON employee_earning_rules(order_type);

-- 1.5 Create EmployeePayoutRequest model (Payout Management)
-- Tracks employee payout requests and processing status
CREATE TABLE employee_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_earnings_id UUID NOT NULL REFERENCES employee_earnings(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  rejection_reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID,
  metadata TEXT
);

-- Indexes for EmployeePayoutRequest
CREATE INDEX payout_requests_status ON employee_payout_requests(status);
CREATE INDEX payout_requests_earnings ON employee_payout_requests(employee_earnings_id);

-- ============================================
-- SECTION 2: UPDATE EXISTING TABLES
-- ============================================

-- 2.1 Update ReviewOrder table
-- Add total_urls column to track number of URLs in the order
ALTER TABLE review_orders ADD COLUMN total_urls INTEGER DEFAULT 0;

-- 2.2 Update EmployeeStats table
-- Add accepting_tasks column for task distribution control
ALTER TABLE employee_stats ADD COLUMN accepting_tasks BOOLEAN DEFAULT true;

-- ============================================
-- SECTION 3: MIGRATE EXISTING DATA
-- ============================================

-- 3.1 Migrate existing orders to ReviewUrl structure
-- Creates a ReviewUrl entry for each existing order with a facebook_url
INSERT INTO review_urls (
  id,
  review_order_id,
  url,
  quantity,
  review_content,
  review_index,
  status,
  assigned_employee_id,
  assigned_at,
  completed_at,
  proof_of_completion,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  facebook_url,
  quantity,
  comment_text,
  0,
  status,
  assigned_employee_id,
  assigned_at,
  completed_at,
  proof_of_completion,
  created_at,
  updated_at
FROM review_orders
WHERE facebook_url IS NOT NULL;

-- 3.2 Update total_urls for migrated orders
UPDATE review_orders
SET total_urls = 1
WHERE facebook_url IS NOT NULL;

-- ============================================
-- SECTION 4: INITIALIZE DEFAULT DATA
-- ============================================

-- 4.1 Create default payment rules
-- These are starting values that admin can modify
INSERT INTO employee_earning_rules (order_type, review_type, payment_amount, priority) VALUES
  ('REVIEW', 'FACEBOOK', 5.00, 10),
  ('COMMENT', 'FACEBOOK', 2.00, 10),
  ('COMMENT_WITH_PHOTO', 'FACEBOOK', 7.00, 10),
  ('REVIEW', NULL, 3.00, 1),  -- Fallback for any REVIEW type
  ('COMMENT', NULL, 1.50, 1), -- Fallback for any COMMENT type
  ('COMMENT_WITH_PHOTO', NULL, 5.00, 1); -- Fallback for any COMMENT_WITH_PHOTO

-- 4.2 Create employee earnings accounts for existing employees
-- This ensures all existing employees have an earnings account
INSERT INTO employee_earnings (user_id, balance, total_earned, current_period_earned, status)
SELECT
  id,
  0.00,
  0.00,
  0.00,
  'ACTIVE'
FROM users
WHERE role = 'EMPLOYEE'
  AND status = 'ACTIVE'
  AND id NOT IN (SELECT user_id FROM employee_earnings);

-- ============================================
-- SECTION 5: VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT
  'review_urls' as table_name,
  COUNT(*) as row_count
FROM review_urls
UNION ALL
SELECT
  'employee_earnings' as table_name,
  COUNT(*) as row_count
FROM employee_earnings
UNION ALL
SELECT
  'employee_earning_transactions' as table_name,
  COUNT(*) as row_count
FROM employee_earning_transactions
UNION ALL
SELECT
  'employee_earning_rules' as table_name,
  COUNT(*) as row_count
FROM employee_earning_rules
UNION ALL
SELECT
  'employee_payout_requests' as table_name,
  COUNT(*) as row_count
FROM employee_payout_requests;

-- Verify payment rules
SELECT
  order_type,
  COALESCE(review_type, 'ALL') as review_type,
  payment_amount,
  currency,
  is_active,
  priority
FROM employee_earning_rules
ORDER BY priority DESC, order_type, review_type;

-- Verify employee earnings accounts
SELECT
  u.name,
  u.email,
  e.balance,
  e.total_earned,
  e.status
FROM employee_earnings e
JOIN users u ON u.id = e.user_id
WHERE u.role = 'EMPLOYEE'
ORDER BY e.created_at DESC;

-- Verify URL migration
SELECT
  COUNT(*) as orders_migrated,
  COUNT(CASE WHEN total_urls > 0 THEN 1 END) as orders_with_urls
FROM review_orders
WHERE facebook_url IS NOT NULL;

-- ============================================
-- SECTION 6: CLEANUP (OPTIONAL)
-- ============================================

-- Uncomment below to remove old unused fields after verifying migration success
-- WARNING: Only run this after confirming all data has been migrated correctly

-- ALTER TABLE review_orders DROP COLUMN IF EXISTS client_feedback;
-- ALTER TABLE review_orders DROP COLUMN IF EXISTS admin_verification_status;
-- ALTER TABLE review_orders DROP COLUMN IF EXISTS admin_verified_at;

-- ============================================
-- ROLLBACK SCRIPT (SAVE THIS SEPARATELY)
-- ============================================

/*
-- To rollback this migration, run the following:

-- Drop new tables
DROP TABLE IF EXISTS employee_payout_requests;
DROP TABLE IF EXISTS employee_earning_rules;
DROP TABLE IF EXISTS employee_earning_transactions;
DROP TABLE IF EXISTS employee_earnings;
DROP TABLE IF EXISTS review_urls;

-- Remove columns from existing tables
ALTER TABLE review_orders DROP COLUMN IF EXISTS total_urls;
ALTER TABLE employee_stats DROP COLUMN IF EXISTS accepting_tasks;

-- Note: This will lose any new data created after migration
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Update Prisma schema to match new database structure
-- 2. Run 'npx prisma db pull' to sync Prisma with Supabase
-- 3. Implement server actions for new functionality
-- 4. Update UI components
-- ============================================
