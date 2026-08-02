export type ProfileAccountRecord = {
  id: string;
  profile_name: string;
  account_email: string;
  account_password?: string;
  email_password?: string | null;
  two_factor_secret?: string | null;
  ixbrowser_profile_id?: string | null;
  ixbrowser_group?: string | null;
  status: "AVAILABLE" | "ASSIGNED" | "ACTIVE" | "EXPIRED" | "BANNED" | "CANCELLED" | "REQUEST_CHANGE";
  admin_notes?: string | null;
  client_notes?: string | null;
  assigned_client_id?: string | null;
  assignment_date?: string | null;
  expiration_date?: string | null;
  renewal_count?: number | null;
  current_renewal_month?: number | null;
  client_name?: string;
  client_email?: string;
};

export type ActiveClient = {
  id: string;
  name: string;
  email: string;
};
