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
  userId: string;
  billingType: "INDIVIDUAL" | "COMPANY";
  country: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  vatNumber?: string | null;
  fiscalCode?: string | null;
  sdiCode?: string | null;
  updatedAt?: string;
};
