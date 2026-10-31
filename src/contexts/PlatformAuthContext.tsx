// Separate platform auth realm for the Super Admin console.
// This is intentionally independent of the school-tenant AuthContext —
// platform users authenticate against /api/platform/auth with their own
// tokens stored under different localStorage keys.
import {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import platformApi from "../utils/platformApi";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled?: boolean;
}

interface PlatformAuthContextType {
  user: PlatformUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const PlatformAuthContext = createContext<PlatformAuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const PlatformAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("platformToken");
      const storedUser = localStorage.getItem("platformUser");
      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          platformApi.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${token}`;
          // Validate the token is still live
          try {
            const me = await platformApi.get("/auth/me");
            setUser(me.data);
            localStorage.setItem("platformUser", JSON.stringify(me.data));
          } catch {
            // token expired or revoked
            localStorage.removeItem("platformToken");
            localStorage.removeItem("platformUser");
            setUser(null);
          }
        } catch {
          localStorage.removeItem("platformUser");
        }
      }
      setLoading(false);
    };
    initialize();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await platformApi.post("/auth/login", { email, password });
      const { token, user: u } = res.data;
      localStorage.setItem("platformToken", token);
      localStorage.setItem("platformUser", JSON.stringify(u));
      platformApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(u);
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.response?.data?.error || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("platformToken");
    localStorage.removeItem("platformUser");
    delete platformApi.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <PlatformAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = () => useContext(PlatformAuthContext);
