// AuthContext.tsx
import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../services/api'; // 👈 Import your configured axios instance

type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | null;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string; // 👈 added for multi‑tenancy
}

interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      // 👇 Use the configured api instance instead of fetch
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // Ensure the user object contains schoolId
      if (!user.schoolId) {
        console.warn('Login response missing schoolId');
      }

      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Store tenantId for API interceptor
      if (user.schoolId) {
        localStorage.setItem('tenantId', user.schoolId);
      }

      return { success: true, user };
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different error types
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        return { 
          success: false, 
          error: err.response.data?.error || 'Login failed. Please check your credentials.' 
        };
      } else if (err.request) {
        // The request was made but no response was received
        return { 
          success: false, 
          error: 'Network error. Please check your connection.' 
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        return { 
          success: false, 
          error: 'An unexpected error occurred. Please try again.' 
        };
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId'); // 👈 clear tenant on logout
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};