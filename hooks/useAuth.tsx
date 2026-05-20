import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getStoredToken, getStoredUser, clearAuthData, setSessionExpiredHandler, AuthUser } from "@/services/api";

interface AuthContextValue {
  isAuthed: boolean;
  authChecked: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  setAuthed: (value: boolean) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    Promise.all([getStoredToken(), getStoredUser()]).then(([token, storedUser]) => {
      setIsAuthed(!!token);
      setUser(storedUser);
      setAuthChecked(true);
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const storedUser = await getStoredUser();
    setUser(storedUser);
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthData();
    setIsAuthed(false);
    setUser(null);
  }, []);

  const isAdmin = user?.userType === "superadmin";

  // Register global handler so apiRequest can trigger logout on expired tokens
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAuthData();
      setIsAuthed(false);
    });
    return () => setSessionExpiredHandler(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthed, authChecked, user, isAdmin, setAuthed: setIsAuthed, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
