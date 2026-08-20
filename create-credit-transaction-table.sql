-- Run this in your Supabase SQL Editor to create the missing CreditTransaction table

CREATE TABLE IF NOT EXISTS "public"."CreditTransaction" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reference_id" TEXT,
  "metadata" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "CreditTransaction_user_id_idx" ON "public"."CreditTransaction"("user_id");
CREATE INDEX IF NOT EXISTS "CreditTransaction_created_at_idx" ON "public"."CreditTransaction"("created_at");
CREATE INDEX IF NOT EXISTS "CreditTransaction_user_id_type_created_at_idx" ON "public"."CreditTransaction"("user_id", "type", "created_at");

-- Add foreign key constraint
ALTER TABLE "public"."CreditTransaction"
ADD CONSTRAINT "CreditTransaction_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."CreditTransaction" ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own credit transactions"
ON "public"."CreditTransaction"
FOR SELECT
USING (auth.uid()::text = "user_id");

-- Service role can do everything
CREATE POLICY "Service role can manage credit transactions"
ON "public"."CreditTransaction"
FOR ALL
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON "public"."CreditTransaction" TO service_role;
GRANT SELECT ON "public"."CreditTransaction" TO authenticated;
