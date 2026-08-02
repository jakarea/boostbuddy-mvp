export type ClientUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  createdAt?: string; // Add this if needed by frontend
  admin_notes?: string | null;
  email_verified?: boolean;
};

export type BillingInfo = {
  id?: string;
  client_id: string;
  billing_type: "INDIVIDUAL" | "COMPANY";
  country: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  vat_number?: string | null;
  fiscal_code?: string | null;
  sdi_code?: string | null;
  created_at?: string;
  updated_at?: string;
};
