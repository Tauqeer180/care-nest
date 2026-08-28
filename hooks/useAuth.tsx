import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { AppState } from "react-native";
import { getStoredToken, getStoredUser, clearAuthData, setSessionExpiredHandler, refreshAuthToken, getLoginAt, AuthUser } from "@/services/api";
import { getAttendanceStatus, checkOut } from "@/services/attendanceService";

// Hard session lifetime cap, measured from login. After this, the session is
// force-expired and a checked-in employee is auto-checked-out.
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Best-effort: if the current user is a checked-in employee, check them out.
 * Never throws — used on both deliberate logout and session expiry, and must
 * not block either. Skipped for admins and clients (no check-in concept).
 */
async function autoCheckoutEmployee(): Promise<void> {
  try {
    const storedUser = await getStoredUser();
    if (
      storedUser &&
      storedUser.userType !== "superadmin" &&
      storedUser.userType !== "client"
    ) {
      const status = await getAttendanceStatus();
      if (status.isCheckedIn) {
        await checkOut();
      }
    }
  } catch {
    // ignore — checkout is best-effort
  }
}

interface AuthContextValue {
  isAuthed: boolean;
  authChecked: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  isClient: boolean;
  setAuthed: (value: boolean) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    const storedUser = await getStoredUser();
    setUser(storedUser);
  }, []);

  // Ends the session: auto-checkout (if a checked-in employee) then clear auth.
  // Shared by deliberate logout and the 24h expiry path.
  const endSession = useCallback(async () => {
    await autoCheckoutEmployee();
    await clearAuthData();
    setIsAuthed(false);
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    await endSession();
  }, [endSession]);

  /**
   * Enforces the hard 24h session cap. If the session is older than the cap,
   * auto-checks-out the employee and signs them out. Returns true if expired.
   * Runs locally (no network) so it works even offline.
   */
  const enforceSessionExpiry = useCallback(async (): Promise<boolean> => {
    const loginAt = await getLoginAt();
    if (loginAt && Date.now() - loginAt >= SESSION_MAX_AGE_MS) {
      await endSession();
      return true;
    }
    return false;
  }, [endSession]);

  /**
   * Validates (and extends) the session via the refresh-token endpoint.
   * Called on launch and whenever the app returns to the foreground, so a token
   * that expired while the app was backgrounded bounces the user to login
   * promptly — instead of only being caught later by a failing API call.
   *
   * Only an explicit server rejection signs the user out; a network error
   * leaves the session intact (the reactive 401 handler will catch it later).
   */
  const revalidateSession = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) return; // not logged in — nothing to revalidate
    const result = await refreshAuthToken();
    if (result.status === "auth_failed") {
      await clearAuthData();
      setIsAuthed(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([getStoredToken(), getStoredUser()]).then(async ([token, storedUser]) => {
      setIsAuthed(!!token);
      setUser(storedUser);
      setAuthChecked(true);
      if (token) {
        // Enforce the 24h cap first; only revalidate if the session is still alive.
        const expired = await enforceSessionExpiry();
        if (!expired) revalidateSession();
      }
    });
  }, [enforceSessionExpiry, revalidateSession]);

  // On returning to the foreground: enforce the 24h cap, then revalidate.
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const expired = await enforceSessionExpiry();
        if (!expired) revalidateSession();
      }
    });
    return () => sub.remove();
  }, [enforceSessionExpiry, revalidateSession]);

  // Schedule expiry while the app stays open continuously past the cap
  // (AppState "active" won't fire if the app never backgrounds).
  useEffect(() => {
    if (!isAuthed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    getLoginAt().then((loginAt) => {
      if (!loginAt) return;
      const remaining = loginAt + SESSION_MAX_AGE_MS - Date.now();
      if (remaining <= 0) {
        enforceSessionExpiry();
      } else {
        timer = setTimeout(() => enforceSessionExpiry(), remaining);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAuthed, enforceSessionExpiry]);

  const isAdmin = user?.userType === "superadmin";
  const isClient = user?.userType === "client";

  // Register global handler so apiRequest can trigger logout on expired tokens
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAuthData();
      setIsAuthed(false);
    });
    return () => setSessionExpiredHandler(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthed, authChecked, user, isAdmin, isClient, setAuthed: setIsAuthed, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
