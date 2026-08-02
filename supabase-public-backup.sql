--
-- PostgreSQL database dump
--

\restrict GUupjYgqeF2Eg3yRShPPNgi59RVeHysQebjqzk2FjJyoQok2WALEZHeFtentdoV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP POLICY IF EXISTS users_view_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_admin_update ON public.users;
DROP POLICY IF EXISTS users_admin_select ON public.users;
DROP POLICY IF EXISTS services_view_active ON public.services;
DROP POLICY IF EXISTS services_admin_all ON public.services;
DROP POLICY IF EXISTS profiles_view_own ON public.profile_accounts;
DROP POLICY IF EXISTS profiles_admin_all ON public.profile_accounts;
DROP POLICY IF EXISTS orders_view_own ON public.orders;
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
DROP POLICY IF EXISTS invoices_view_own ON public.invoices;
DROP POLICY IF EXISTS invoices_admin_all ON public.invoices;
DROP POLICY IF EXISTS billing_view_own ON public.billing_info;
DROP POLICY IF EXISTS billing_update_own ON public.billing_info;
DROP POLICY IF EXISTS billing_admin_all ON public.billing_info;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own billing_info" ON public.billing_info;
DROP POLICY IF EXISTS "Users can view profiles assigned to them" ON public.profile_accounts;
DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own billing_info" ON public.billing_info;
DROP POLICY IF EXISTS "Users can manage own telegram config" ON public.user_telegram_configs;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage all telegram configs" ON public.user_telegram_configs;
DROP POLICY IF EXISTS "Admins can manage all notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Admin write access" ON public.app_settings;
DROP POLICY IF EXISTS "Admin read access" ON public.app_settings;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_telegram_configs DROP CONSTRAINT IF EXISTS user_telegram_configs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profile_accounts DROP CONSTRAINT IF EXISTS profile_accounts_service_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profile_accounts DROP CONSTRAINT IF EXISTS profile_accounts_assigned_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_profile_account_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.billing_info DROP CONSTRAINT IF EXISTS billing_info_user_id_fkey;
DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
DROP INDEX IF EXISTS public.idx_users_status;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_services_active;
DROP INDEX IF EXISTS public.idx_profile_accounts_status;
DROP INDEX IF EXISTS public.idx_profile_accounts_expiration_date;
DROP INDEX IF EXISTS public.idx_profile_accounts_assigned_client_id;
DROP INDEX IF EXISTS public.idx_orders_user_id;
DROP INDEX IF EXISTS public.idx_orders_stripe_session_id;
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_invoices_user_id;
DROP INDEX IF EXISTS public.idx_invoices_order_id;
DROP INDEX IF EXISTS public.idx_billing_info_user_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_telegram_configs DROP CONSTRAINT IF EXISTS user_telegram_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_pkey;
ALTER TABLE IF EXISTS ONLY public.profile_accounts DROP CONSTRAINT IF EXISTS profile_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_stripe_session_id_key;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.billing_info DROP CONSTRAINT IF EXISTS billing_info_user_id_key;
ALTER TABLE IF EXISTS ONLY public.billing_info DROP CONSTRAINT IF EXISTS billing_info_pkey;
ALTER TABLE IF EXISTS ONLY public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_telegram_configs;
DROP TABLE IF EXISTS public.services;
DROP TABLE IF EXISTS public.profile_accounts;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.notification_logs;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.billing_info;
DROP TABLE IF EXISTS public.app_settings;
DROP FUNCTION IF EXISTS public.update_app_settings_timestamp();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::TEXT, 'CLIENT'),
    COALESCE((new.raw_user_meta_data->>'status')::TEXT, 'PENDING'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$;


--
-- Name: update_app_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_app_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    billing_type text NOT NULL,
    country text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    postal_code text NOT NULL,
    vat_number text,
    fiscal_code text,
    sdi_code text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT billing_info_billing_type_check CHECK ((billing_type = ANY (ARRAY['INDIVIDUAL'::text, 'COMPANY'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    payment_period_start timestamp with time zone,
    payment_period_end timestamp with time zone,
    pdf_path text NOT NULL,
    file_name text,
    file_size text,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    body text,
    type text NOT NULL,
    channel text DEFAULT 'EMAIL'::text NOT NULL,
    status text DEFAULT 'SENT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    service_id text,
    stripe_session_id text,
    amount double precision NOT NULL,
    status text NOT NULL,
    type text NOT NULL,
    profile_account_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'PAID'::text, 'FAILED'::text]))),
    CONSTRAINT orders_type_check CHECK ((type = ANY (ARRAY['PURCHASE'::text, 'RENEWAL'::text])))
);


--
-- Name: profile_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_name text NOT NULL,
    account_email text NOT NULL,
    account_password text NOT NULL,
    email_password text,
    two_factor_secret text,
    ixbrowser_profile_id text,
    ixbrowser_group text,
    status text NOT NULL,
    admin_notes text,
    client_notes text,
    assigned_client_id uuid,
    assignment_date timestamp with time zone,
    expiration_date timestamp with time zone,
    renewal_count integer DEFAULT 0 NOT NULL,
    current_renewal_month integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    service_id text,
    CONSTRAINT profile_accounts_status_check CHECK ((status = ANY (ARRAY['AVAILABLE'::text, 'ASSIGNED'::text, 'ACTIVE'::text, 'EXPIRED'::text, 'BANNED'::text, 'CANCELLED'::text, 'REQUEST_CHANGE'::text])))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price double precision NOT NULL,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    requires_manual_assignment boolean DEFAULT true NOT NULL,
    instructions text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: user_telegram_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_telegram_configs (
    user_id uuid NOT NULL,
    chat_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'CLIENT'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    email_verified boolean DEFAULT true,
    admin_notes text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['ADMIN'::text, 'CLIENT'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'DEACTIVATED'::text])))
);


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
telegram_bot	{"chat_id": "1357123176", "bot_token": "8870002977:AAFqTzEzcWbI-MJV1oEl6dhDEvdTDRRGDck"}	2026-06-26 06:35:49.11634+00
\.


--
-- Data for Name: billing_info; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_info (id, user_id, billing_type, country, name, address, city, postal_code, vat_number, fiscal_code, sdi_code, updated_at) FROM stdin;
0cbba8a3-10c3-4202-8b31-384ac7606dec	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	INDIVIDUAL	Italy	Marco Rossi	Via Roma 12	Milan	20121	\N	RSSMRC85M01H501U	\N	2026-06-24 06:25:05.452653+00
6d08c86e-f1b4-4922-ac61-9377e316c248	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13	COMPANY	Italy	Bianchi Digital SRL	Via Condotti 45	Rome	00187	IT01234567890	\N	M5UXCR1	2026-06-24 06:25:05.452653+00
49f86483-e974-4c36-b0df-e8de0e51fe1c	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14	INDIVIDUAL	Italy	Luca Ferrari	Corso Vittorio Emanuele II 78	Turin	10121	\N	FRRLCU90A01L219Y	\N	2026-06-24 06:25:05.452653+00
190dfa91-82d4-4ff2-8640-e9deb104fd34	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	COMPANY	Italy	Romano Consulting	Via Chiaia 152	Naples	80121	IT09876543210	\N	SUBM70N	2026-06-24 06:25:05.452653+00
1e2e16f5-5d3f-4a57-8718-073ad724d1d4	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	INDIVIDUAL	Italy	Alessandro Conti	Via de' Bardi 22	Florence	50125	\N	CNTLSN88T12D612K	\N	2026-06-24 06:25:05.452653+00
de89d4d3-060c-434f-bd0f-106a4f1fe7d5	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	INDIVIDUAL	Italy	Elena Moretti	Via dell'Indipendenza 9	Bologna	40121	\N	MRTLNE92S45A944Z	\N	2026-06-24 06:25:05.452653+00
c44498a6-5ff5-4548-98bd-8a3a515b3247	0e63c61f-aed8-4b36-9658-7925cd9d757d	INDIVIDUAL	Italy	John doe2	Dhaka	Bogura	589	\N	\N	\N	2026-06-25 10:55:59.677224+00
de2cf0f4-8644-48b7-83ce-0abeb4672759	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20	INDIVIDUAL	Italy	Paolo Ricci	Bogura	Noga	333	\N	\N	\N	2026-06-25 10:56:32.267546+00
a10c0581-e939-4ab6-8683-da306666c373	695327c6-ea27-491d-afb8-114e73b22749	INDIVIDUAL	Italy	Client 13	Rome, Italy	Rome	A10043	ITBHJue8663	RSSnd9euud	\N	2026-06-26 01:21:14.39926+00
04138776-6c9d-4a21-a64e-9c884a91acb6	c6c02c12-6315-44e0-979f-d4776ab0375a	INDIVIDUAL	Italy	Jony vai	Dhaka	Bogura	3456	\N	tre	\N	2026-06-26 02:43:56.66+00
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, user_id, order_id, payment_period_start, payment_period_end, pdf_path, file_name, file_size, uploaded_at) FROM stdin;
a0000000-0000-0000-0000-000000000001	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	90000000-0000-0000-0000-000000000001	2026-06-09 06:25:05.452653+00	2026-07-09 06:25:05.452653+00	/invoices/invoice_starter_marco_jun26.pdf	invoice_starter_marco_jun26.pdf	142 KB	2026-06-10 06:25:05.452653+00
a0000000-0000-0000-0000-000000000002	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13	90000000-0000-0000-0000-000000000004	2026-05-27 06:25:05.452653+00	2026-06-26 06:25:05.452653+00	/invoices/invoice_business_sofia_may26.pdf	invoice_business_sofia_may26.pdf	158 KB	2026-05-28 06:25:05.452653+00
a0000000-0000-0000-0000-000000000004	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	90000000-0000-0000-0000-000000000008	2026-05-17 06:25:05.452653+00	2026-06-16 06:25:05.452653+00	/invoices/invoice_business_giulia_apr26.pdf	invoice_business_giulia_apr26.pdf	161 KB	2026-05-18 06:25:05.452653+00
a0000000-0000-0000-0000-000000000005	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	90000000-0000-0000-0000-000000000010	2026-06-06 06:25:05.452653+00	2026-08-05 06:25:05.452653+00	/invoices/invoice_enterprise_alessandro_jun26.pdf	invoice_enterprise_alessandro_jun26.pdf	210 KB	2026-06-07 06:25:05.452653+00
a0000000-0000-0000-0000-000000000007	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	90000000-0000-0000-0000-000000000012	2026-05-20 06:25:05.452653+00	2026-06-19 06:25:05.452653+00	/invoices/invoice_starter_elena_mar26.pdf	invoice_starter_elena_mar26.pdf	139 KB	2026-05-21 06:25:05.452653+00
a0000000-0000-0000-0000-000000000008	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	90000000-0000-0000-0000-000000000009	2026-06-16 06:25:05.452653+00	2026-07-16 06:25:05.452653+00	/invoices/invoice_renewal_giulia_jun26.pdf	invoice_renewal_giulia_jun26.pdf	143 KB	2026-06-17 06:25:05.452653+00
8c2ff2e1-e1e7-4e91-afc9-c5e3af732b91	c6c02c12-6315-44e0-979f-d4776ab0375a	\N	2026-06-26 00:00:00+00	2026-07-26 00:00:00+00	1782438181005_84wx9pp.pdf	LANDING_PAGE_DESIGN_GUIDE.pdf	91.88 KB	2026-06-26 01:43:01.751778+00
\.


--
-- Data for Name: notification_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_logs (id, recipient, subject, body, type, channel, status, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, service_id, stripe_session_id, amount, status, type, profile_account_id, created_at, updated_at) FROM stdin;
90000000-0000-0000-0000-000000000001	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	srv-starter	cs_test_marco_1	49	PAID	PURCHASE	\N	2026-06-09 06:25:05.452653+00	2026-06-09 06:25:05.452653+00
90000000-0000-0000-0000-000000000002	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	srv-starter	cs_test_marco_2	49	PAID	PURCHASE	\N	2026-05-15 06:25:05.452653+00	2026-05-15 06:25:05.452653+00
90000000-0000-0000-0000-000000000004	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13	srv-business	cs_test_sofia_1	129	PAID	PURCHASE	\N	2026-05-27 06:25:05.452653+00	2026-05-27 06:25:05.452653+00
90000000-0000-0000-0000-000000000005	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13	\N	cs_test_sofia_2	129	PAID	RENEWAL	80000000-0000-0000-0000-000000000005	2026-06-23 06:25:05.452653+00	2026-06-23 06:25:05.452653+00
90000000-0000-0000-0000-000000000006	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14	srv-starter	cs_test_luca_1	49	PAID	PURCHASE	\N	2026-06-19 06:25:05.452653+00	2026-06-19 06:25:05.452653+00
90000000-0000-0000-0000-000000000007	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14	srv-starter	cs_test_luca_2	49	PENDING	PURCHASE	\N	2026-06-23 06:25:05.452653+00	2026-06-23 06:25:05.452653+00
90000000-0000-0000-0000-000000000008	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	srv-business	cs_test_giulia_1	129	PAID	PURCHASE	\N	2026-05-17 06:25:05.452653+00	2026-05-17 06:25:05.452653+00
90000000-0000-0000-0000-000000000010	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	srv-enterprise	cs_test_ale_1	299	PAID	PURCHASE	\N	2026-06-06 06:25:05.452653+00	2026-06-06 06:25:05.452653+00
90000000-0000-0000-0000-000000000011	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	\N	cs_test_ale_2	299	FAILED	RENEWAL	80000000-0000-0000-0000-000000000008	2026-06-23 06:25:05.452653+00	2026-06-23 06:25:05.452653+00
90000000-0000-0000-0000-000000000012	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	srv-starter	cs_test_elena_1	49	PAID	PURCHASE	\N	2026-05-20 06:25:05.452653+00	2026-05-20 06:25:05.452653+00
90000000-0000-0000-0000-000000000013	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	\N	cs_test_elena_2	49	PAID	RENEWAL	80000000-0000-0000-0000-000000000009	2026-06-19 06:25:05.452653+00	2026-06-19 06:25:05.452653+00
90000000-0000-0000-0000-000000000014	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18	srv-starter	cs_test_anna_1	49	PAID	PURCHASE	\N	2026-06-22 06:25:05.452653+00	2026-06-22 06:25:05.452653+00
90000000-0000-0000-0000-000000000009	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	\N	cs_test_giulia_2	129	PAID	RENEWAL	\N	2026-06-16 06:25:05.452653+00	2026-06-16 06:25:05.452653+00
90000000-0000-0000-0000-000000000003	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	\N	cs_test_marco_3	49	PAID	RENEWAL	\N	2026-06-22 06:25:05.452653+00	2026-06-22 06:25:05.452653+00
fe417449-17d2-4613-80bb-4319d7ffd229	c6c02c12-6315-44e0-979f-d4776ab0375a	srv-business	simulated_sess_mahumi	129	PAID	PURCHASE	\N	2026-06-26 02:07:20.487081+00	2026-06-26 02:07:20.487081+00
\.


--
-- Data for Name: profile_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profile_accounts (id, profile_name, account_email, account_password, email_password, two_factor_secret, ixbrowser_profile_id, ixbrowser_group, status, admin_notes, client_notes, assigned_client_id, assignment_date, expiration_date, renewal_count, current_renewal_month, created_at, updated_at, service_id) FROM stdin;
80000000-0000-0000-0000-000000000002	Chrome-EU-Proxy-02	eu-agent-02@gmail.com	Password123!	\N	\N	\N	\N	AVAILABLE	Germany residential proxy, calibrated.	\N	\N	\N	\N	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000006	Chrome-US-Proxy-06	luca.agent.us@gmail.com	LucaPassword77!	\N	\N	ix-p-33441	\N	ACTIVE	\N	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14	2026-06-19 06:25:05.452653+00	2026-07-19 06:25:05.452653+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000008	Chrome-US-Proxy-08	ale.agent.us@gmail.com	AlePassword33!	\N	\N	ix-p-55667	\N	ACTIVE	\N	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	2026-06-06 06:25:05.452653+00	2026-08-05 06:25:05.452653+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000009	Chrome-EU-Proxy-09	elena.agent.eu@gmail.com	ElenaPassword11!	\N	\N	\N	\N	EXPIRED	\N	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	2026-05-20 06:25:05.452653+00	2026-06-19 06:25:05.452653+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000010	Chrome-US-Proxy-10	marco.expired.us@gmail.com	MarcoOldPassword!	\N	\N	\N	\N	EXPIRED	\N	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	2026-05-15 06:25:05.452653+00	2026-06-14 06:25:05.452653+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000011	Chrome-US-Proxy-11	bad.agent@gmail.com	BannedPassword9!	\N	\N	\N	\N	BANNED	Violated terms of service on third-party site. Do not reuse proxy IP.	\N	\N	\N	\N	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000012	Chrome-EU-Proxy-12	cancelled.agent@gmail.com	CancelledPassword4!	\N	\N	\N	\N	CANCELLED	Client requested termination of subscription.	\N	\N	\N	\N	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000001	Chrome-US-Proxy-01	us-agent-01@gmail.com	Password123!	EmailPassword99!	JBSWY3DPEHPK3PXP	\N	\N	ACTIVE	Fresh US proxy, ready for assignment.	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	2026-07-09 00:00:00+00	2026-08-08 00:00:00+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
2a8bee9f-c51c-4858-9385-812cfd4e79b1	S14	kerryeast68@hotmail.com	123	\N	SUNT DGBU LQY3 LU62 O3CJ 2EHW VBBA WQN5	S14	Filippo	ACTIVE	\N	\N	f9f8bc27-84cd-466a-9a65-03255bca5f7c	2026-07-10 00:00:00+00	2026-08-09 00:00:00+00	0	\N	2026-07-07 06:07:40.208775+00	2026-07-07 06:07:40.208775+00	\N
44696743-5622-499b-89d5-8e03346994c6	Fabiola Marino	fabiolamarino4@outlook.it	ponteve123!!	ponteve123!!	\N	M48	Cliente 1	REQUEST_CHANGE	\N	\N	c6c02c12-6315-44e0-979f-d4776ab0375a	2026-07-01 00:00:00+00	2026-07-31 00:00:00+00	0	\N	2026-07-01 23:46:56.309036+00	2026-07-01 23:46:56.309036+00	22222222-2222-2222-2222-222222222222
80000000-0000-0000-0000-000000000005	Chrome-EU-Proxy-05	sofia.agent.eu@gmail.com	SofiaPassword99!	\N	\N	ix-p-77112	\N	ASSIGNED	\N	\N	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	2026-07-09 00:00:00+00	2026-08-08 00:00:00+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
80000000-0000-0000-0000-000000000003	Chrome-UK-Proxy-303	uk-agent-03@gmail.com303	UKSecurePassword!303	303	303	303	303	ASSIGNED	303	303	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	2026-07-09 00:00:00+00	2026-08-08 00:00:00+00	0	\N	2026-06-24 06:25:05.452653+00	2026-06-24 06:25:05.452653+00	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, name, description, price, duration_days, is_active, requires_manual_assignment, instructions, created_at, updated_at) FROM stdin;
srv-enterprise	Enterprise Suite	Includes 8 high-performance browser profiles with dedicated ultra-fast proxy servers. Designed for corporate/enterprise scale.	299	60	f	t	Steps to import:\\n1. Download and open IXBrowser.\\n2. Contact account manager to get the Enterprise group invitation code.\\n3. Enter code under Group Management.\\n4. All 8 profiles will automatically appear in your panel.	2026-06-24 06:20:28.533276+00	2026-06-24 06:20:28.533276+00
srv-starter	Starter Profile	Includes 1 high-speed clean browser profile with US/EU residential proxy configuration. Ideal for single platform operations.	49	30	f	f	Steps to import:\\n1. \r\nDownload and open IXBrowser.\\n2. \r\nIn Member Center, click 'Create Profile'.\\n3. \r\nInput the Profile ID provided under your assigned profile details.\\n4. \r\nOpen the profile manually within IXBrowser.	2026-06-24 06:20:28.533276+00	2026-06-26 01:40:37.915+00
srv-trial	Trial Profile	7-day access to a single standard browser profile to test proxy compatibility and speed.	9.99	3	f	t	Steps to import:\\n1. Download and open IXBrowser.\\n2. Click 'Create Profile' and use the trial credentials.\\n3. Testing profile is valid for 7 days.	2026-06-24 06:20:28.533276+00	2026-07-01 23:31:51.887+00
11111111-1111-1111-1111-111111111111	7 Days Plan	7-day access to browser profile with high-speed residential proxies.	99	7	t	t	Import profile to IXBrowser and start using.	2026-07-02 21:23:45.840953+00	2026-07-02 21:23:45.840953+00
22222222-2222-2222-2222-222222222222	30 Days Plan	30-day access to browser profile with premium residential proxies.	299	30	t	t	Import profile to IXBrowser and start using.	2026-07-02 21:23:45.840953+00	2026-07-02 21:23:45.840953+00
33333333-3333-3333-3333-333333333333	3 Months Plan	90-day access to browser profile with premium residential proxies.	799	90	t	t	Import profile to IXBrowser and start using.	2026-07-02 21:23:45.840953+00	2026-07-02 21:23:45.840953+00
44444444-4444-4444-4444-444444444444	6 Months Plan	180-day access to browser profile with premium residential proxies.	1499	180	t	t	Import profile to IXBrowser and start using.	2026-07-02 21:23:45.840953+00	2026-07-02 21:23:45.840953+00
55555555-5555-5555-5555-555555555555	12 Months Plan	360-day access to browser profile with premium residential proxies.	2990	360	t	t	Import profile to IXBrowser and start using.	2026-07-02 21:23:45.840953+00	2026-07-02 21:23:45.840953+00
srv-business	Business Bundle	Includes 3 clean browser profiles with dedicated IPs. Perfect for growing client management teams.	129	30	t	t	Steps to import:\\n1. Download and open IXBrowser.\\n2. Click 'Profiles Manager' and select Group Import.\\n3. Enter the Group ID provided on your active browser profiles dashboard.\\n4. Click import. Profiles will sync to your computer.	2026-06-24 06:20:28.533276+00	2026-07-09 17:35:14.024+00
\.


--
-- Data for Name: user_telegram_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_telegram_configs (user_id, chat_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, role, status, created_at, email_verified, admin_notes) FROM stdin;
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12	Marco Rossi	marco.rossi@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13	Sofia Bianchi	sofia.bianchi@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14	Luca Ferrari	luca.ferrari@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15	Giulia Romano	giulia.romano@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16	Alessandro Conti	a.conti@protonmail.com	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17	Elena Moretti	elena.moretti@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
2b50f05b-a96c-4f31-b6b0-fa53722d3998	Jakarea	jakareaparvez@gmail.com	ADMIN	ACTIVE	2026-06-25 03:12:16.847974+00	t	\N
c6c02c12-6315-44e0-979f-d4776ab0375a	Jony	jony@yopmail.com	CLIENT	ACTIVE	2026-06-25 10:12:55.646524+00	t	\N
0e63c61f-aed8-4b36-9658-7925cd9d757d	John doe2	john2@yopmail.com	CLIENT	ACTIVE	2026-06-25 00:32:31.457533+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20	Paolo Ricci	paolo.ricci@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
b26ec1c7-b6e5-4df6-89f3-6e5395f10b1e	John doe	john@yopmail.com	CLIENT	ACTIVE	2026-06-24 06:30:19.256502+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18	Anna Greco	anna.greco@email.it	CLIENT	ACTIVE	2026-06-24 06:25:05.452653+00	t	\N
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19	Davide Colombo	d.colombo@gmail.com	CLIENT	DEACTIVATED	2026-06-24 06:25:05.452653+00	t	\N
f9f8bc27-84cd-466a-9a65-03255bca5f7c	filippo pistone	filippoleadaffiliate@gmail.com	CLIENT	ACTIVE	2026-07-06 21:11:42.674367+00	t	\N
695327c6-ea27-491d-afb8-114e73b22749	Client 13	client13@yopmail.com	CLIENT	DEACTIVATED	2026-06-26 01:20:02.703839+00	t	Test
92f173b7-e91b-4928-9632-fcacb2cf883f	stefano bernardi	sbernardi@yandex.com	ADMIN	ACTIVE	2026-07-09 18:13:36.662954+00	t	\N
f38df1c8-bf12-4782-941d-ef4494b030af	stefano cliente	stesbe1221@gmail.com	CLIENT	ACTIVE	2026-07-10 09:27:34.201004+00	t	\N
\.


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: billing_info billing_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_pkey PRIMARY KEY (id);


--
-- Name: billing_info billing_info_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_user_id_key UNIQUE (user_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_stripe_session_id_key UNIQUE (stripe_session_id);


--
-- Name: profile_accounts profile_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_accounts
    ADD CONSTRAINT profile_accounts_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: user_telegram_configs user_telegram_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_telegram_configs
    ADD CONSTRAINT user_telegram_configs_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_billing_info_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_info_user_id ON public.billing_info USING btree (user_id);


--
-- Name: idx_invoices_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_order_id ON public.invoices USING btree (order_id);


--
-- Name: idx_invoices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_stripe_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_stripe_session_id ON public.orders USING btree (stripe_session_id);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_profile_accounts_assigned_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_accounts_assigned_client_id ON public.profile_accounts USING btree (assigned_client_id);


--
-- Name: idx_profile_accounts_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_accounts_expiration_date ON public.profile_accounts USING btree (expiration_date);


--
-- Name: idx_profile_accounts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_accounts_status ON public.profile_accounts USING btree (status);


--
-- Name: idx_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_active ON public.services USING btree (is_active);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: app_settings app_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_timestamp();


--
-- Name: billing_info billing_info_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_info
    ADD CONSTRAINT billing_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_profile_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_profile_account_id_fkey FOREIGN KEY (profile_account_id) REFERENCES public.profile_accounts(id) ON DELETE SET NULL;


--
-- Name: orders orders_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_accounts profile_accounts_assigned_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_accounts
    ADD CONSTRAINT profile_accounts_assigned_client_id_fkey FOREIGN KEY (assigned_client_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: profile_accounts profile_accounts_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_accounts
    ADD CONSTRAINT profile_accounts_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: user_telegram_configs user_telegram_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_telegram_configs
    ADD CONSTRAINT user_telegram_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: app_settings Admin read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin read access" ON public.app_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'ADMIN'::text)))));


--
-- Name: app_settings Admin write access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin write access" ON public.app_settings USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'ADMIN'::text)))));


--
-- Name: notification_logs Admins can manage all notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notification logs" ON public.notification_logs USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'ADMIN'::text)))));


--
-- Name: user_telegram_configs Admins can manage all telegram configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all telegram configs" ON public.user_telegram_configs USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'ADMIN'::text)))));


--
-- Name: services Anyone can view active services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING ((is_active = true));


--
-- Name: orders Users can insert their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_telegram_configs Users can manage own telegram config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own telegram config" ON public.user_telegram_configs USING ((auth.uid() = user_id));


--
-- Name: billing_info Users can manage their own billing_info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own billing_info" ON public.billing_info USING ((auth.uid() = user_id));


--
-- Name: users Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: notification_logs Users can view own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification logs" ON public.notification_logs FOR SELECT USING ((recipient = ( SELECT users.email
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: profile_accounts Users can view profiles assigned to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles assigned to them" ON public.profile_accounts FOR SELECT USING ((assigned_client_id = auth.uid()));


--
-- Name: billing_info Users can view their own billing_info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own billing_info" ON public.billing_info FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoices Users can view their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_info billing_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_admin_all ON public.billing_info USING (public.is_admin());


--
-- Name: billing_info billing_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_update_own ON public.billing_info FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: billing_info billing_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_view_own ON public.billing_info FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoices invoices_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_admin_all ON public.invoices USING (public.is_admin());


--
-- Name: invoices invoices_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_view_own ON public.invoices FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_admin_all ON public.orders USING (public.is_admin());


--
-- Name: orders orders_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_view_own ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profile_accounts profiles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_all ON public.profile_accounts USING (public.is_admin());


--
-- Name: profile_accounts profiles_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_view_own ON public.profile_accounts FOR SELECT USING ((assigned_client_id = auth.uid()));


--
-- Name: services services_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_admin_all ON public.services USING (public.is_admin());


--
-- Name: services services_view_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_view_active ON public.services FOR SELECT USING ((is_active = true));


--
-- Name: user_telegram_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_telegram_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_admin_select ON public.users FOR SELECT USING (public.is_admin());


--
-- Name: users users_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_admin_update ON public.users FOR UPDATE USING (public.is_admin());


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: users users_view_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- PostgreSQL database dump complete
--

\unrestrict GUupjYgqeF2Eg3yRShPPNgi59RVeHysQebjqzk2FjJyoQok2WALEZHeFtentdoV

