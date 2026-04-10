"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { SessionProvider, signIn, signOut } from "next-auth/react";

import { Role } from "@/types/auth";

// User type
interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  language?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner provider that uses session state
function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.user) {
          setUser({
            id: data.user.id as string,
            email: data.user.email as string,
            name: data.user.name as string,
            role: data.user.role as Role,
            language: data.user.language as string | undefined,
          });
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, error: result.error };
      }

      // Refresh user data after login
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.user) {
        setUser({
          id: data.user.id as string,
          email: data.user.email as string,
          name: data.user.name as string,
          role: data.user.role as Role,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: "Error al iniciar sesión" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Error al registrar" };
      }

      // Auto-login after registration
      return await login(email, password);
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, error: "Error al crear la cuenta" };
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}