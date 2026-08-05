-- ============================================================================
-- Performance Indexes for BoostBuddy MVP
-- Migration: Apply performance indexes to review_orders table
-- ============================================================================
-- Run this in Supabase Dashboard → Database → SQL Editor
-- ============================================================================

-- INDEX 1: Optimize review_orders queue page queries
-- The queue page filters by status="PENDING" and orders by created_at DESC
-- This composite index dramatically speeds up both the filter and the sort
CREATE INDEX IF NOT EXISTS idx_review_orders_status_created
ON review_orders(status, created_at DESC);

-- INDEX 2: Optimize employee assignment lookups
-- When viewing orders assigned to a specific employee with their status
-- Used in queue page filtering and employee dashboard
CREATE INDEX IF NOT EXISTS idx_review_orders_employee_status
ON review_orders(assigned_employee_id, status);

-- INDEX 3: Optimize client order history queries
-- The history page filters by client (user_id) and orders by created_at DESC
-- Speeds up order history views for clients
CREATE INDEX IF NOT EXISTS idx_review_orders_user_created
ON review_orders(user_id, created_at DESC);

-- INDEX 4: Optimize status filtering across all pages
-- Standalone status index for quick "all pending orders" count queries
CREATE INDEX IF NOT EXISTS idx_review_orders_status
ON review_orders(status);

-- ============================================================================
-- PERFORMANCE VERIFICATION
-- ============================================================================
-- Run this to verify the indexes are being used:
EXPLAIN ANALYZE
SELECT * FROM review_orders
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Expected: Should show "Index Scan" on idx_review_orders_status_created
