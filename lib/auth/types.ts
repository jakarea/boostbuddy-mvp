// Pure type definitions for auth system
export type AuthRole = "ADMIN" | "CLIENT" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  isActive: boolean;
  createdAt: Date | string;
}

export type AuthState = "LOADING" | "AUTHENTICATED" | "UNAUTHENTICATED";

export interface AuthContextType {
  state: AuthState;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}
