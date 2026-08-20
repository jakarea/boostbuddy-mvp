-- Run this query in your Supabase SQL Editor to check employee availability

-- Check all employees and their settings
SELECT
  id,
  name,
  email,
  is_active,
  accepting_orders,
  status,
  created_at
FROM users
WHERE role = 'EMPLOYEE'
ORDER BY created_at;

-- Check which employees would receive orders
SELECT
  id,
  name,
  email,
  is_active,
  accepting_orders
FROM users
WHERE role = 'EMPLOYEE'
  AND is_active = true
  AND accepting_orders = true;

-- Count IN_PROGRESS orders per employee
SELECT
  u.id,
  u.name,
  COUNT(ro.id) as in_progress_count
FROM users u
LEFT JOIN review_orders ro ON ro.assigned_employee_id = u.id AND ro.status = 'IN_PROGRESS'
WHERE u.role = 'EMPLOYEE'
GROUP BY u.id, u.name
ORDER BY in_progress_count ASC;
