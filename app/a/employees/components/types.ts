export interface EmployeeUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  status: "PENDING" | "ACTIVE" | "DEACTIVATED";
  accepting_orders?: boolean;
  email_verified?: boolean;
  admin_notes?: string;
  created_at: string;
}
