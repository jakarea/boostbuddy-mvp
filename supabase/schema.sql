-- ============================================================================
-- BoostBuddy Supabase Schema
-- Production-ready schema for client portal and admin management
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CLIENT')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'DEACTIVATED')),
  email_verified BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================================
-- 2. SECURITY DEFINER Function (prevents RLS recursion)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can edit all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Admin can see and edit all users (using SECURITY DEFINER function)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can edit all users"
  ON users FOR UPDATE
  USING (public.is_admin());

-- Users can view and edit their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 3. Billing Info Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('INDIVIDUAL', 'COMPANY')),
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  vat_number TEXT,
  fiscal_code TEXT,
  sdi_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_info_user_id ON billing_info(user_id);

ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing info" ON billing_info;
DROP POLICY IF EXISTS "Users can update own billing info" ON billing_info;
DROP POLICY IF EXISTS "Admins can view all billing info" ON billing_info;

CREATE POLICY "Users can view own billing info"
  ON billing_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own billing info"
  ON billing_info FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing info"
  ON billing_info FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- 4. Services Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_manual_assignment BOOLEAN DEFAULT true,
  instructions TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active services" ON services;
DROP POLICY IF EXISTS "Admins can manage services" ON services;

CREATE POLICY "Authenticated users can view active services"
  ON services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON services
  USING (public.is_admin());

-- ============================================================================
-- 5. Profile Accounts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS profile_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_name TEXT NOT NULL,
  account_email TEXT NOT NULL,
  account_password TEXT NOT NULL,
  email_password TEXT,
  two_factor_secret TEXT,
  ixbrowser_profile_id TEXT,
  ixbrowser_group TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'ASSIGNED', 'ACTIVE', 'EXPIRED', 'BANNED', 'CANCELLED', 'REQUEST_CHANGE')
  ),
  admin_notes TEXT,
  client_notes TEXT,
  assigned_client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  assignment_date DATE,
  expiration_date DATE,
  renewal_count INTEGER DEFAULT 0,
  current_renewal_month INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_accounts_status ON profile_accounts(status);
CREATE INDEX IF NOT EXISTS idx_profile_accounts_assigned_client_id ON profile_accounts(assigned_client_id);
CREATE INDEX IF NOT EXISTS idx_profile_accounts_expiration_date ON profile_accounts(expiration_date);

ALTER TABLE profile_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view assigned profiles" ON profile_accounts;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profile_accounts;

CREATE POLICY "Clients can view assigned profiles"
  ON profile_accounts FOR SELECT
  USING (assigned_client_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON profile_accounts
  USING (public.is_admin());

-- ============================================================================
-- 6. Orders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  stripe_session_id TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  type TEXT NOT NULL CHECK (type IN ('PURCHASE', 'RENEWAL')),
  profile_account_id UUID REFERENCES profile_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
  ON orders
  USING (public.is_admin());

-- ============================================================================
-- 7. Invoices Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_period_start DATE,
  payment_period_end DATE,
  pdf_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all invoices"
  ON invoices
  USING (public.is_admin());

-- ============================================================================
-- 8. App Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all app settings" ON app_settings;

CREATE POLICY "Admins can manage all app settings"
  ON app_settings
  USING (public.is_admin());

-- ============================================================================
-- 9. Notification Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  status TEXT NOT NULL DEFAULT 'SENT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Admins can manage all notification logs" ON notification_logs;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (recipient = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all notification logs"
  ON notification_logs
  USING (public.is_admin());

-- ============================================================================
-- 10. User Telegram Configs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_telegram_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_telegram_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own telegram config" ON user_telegram_configs;
DROP POLICY IF EXISTS "Admins can manage all telegram configs" ON user_telegram_configs;

CREATE POLICY "Users can manage own telegram config"
  ON user_telegram_configs
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all telegram configs"
  ON user_telegram_configs
  USING (public.is_admin());

-- ============================================================================
-- 11. Trigger: Auto-create user profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::TEXT, 'CLIENT'),
    COALESCE((new.raw_user_meta_data->>'status')::TEXT, 'ACTIVE'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 12. Grants
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.billing_info TO authenticated;
GRANT SELECT ON public.profile_accounts TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT SELECT ON public.user_telegram_configs TO authenticated;
