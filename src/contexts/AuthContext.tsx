// AuthContext.tsx
import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../services/api';

// Roles now come from the backend (system + admin-created custom roles)
type UserRole = string;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;             // primary/legacy role
  roles?: string[];           // all roles held by the user
  privileges?: string[];      // effective privileges from roles
  schoolId: string;
  allowedPages?: string[];    // direct privilege grants (legacy)
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Set default headers for all API requests
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          if (parsedUser.schoolId) {
            api.defaults.headers.common['x-tenant-id'] = parsedUser.schoolId;
            localStorage.setItem('tenantId', parsedUser.schoolId);
          }

          // Re-fetch the user so role/privilege changes made by an admin
          // take effect without requiring a re-login.
          try {
            const meRes = await api.get('/auth/me');
            const fresh = meRes.data;
            if (fresh && fresh.id) {
              setUser(fresh);
              localStorage.setItem('user', JSON.stringify(fresh));
            }
          } catch {
            // keep the stored user if the refresh fails (e.g. offline)
          }

          console.log('✅ Auth initialized:', {
            user: parsedUser.name,
            role: parsedUser.role,
            schoolId: parsedUser.schoolId
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      console.log('🔐 Attempting login for:', email);

      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      console.log('✅ Login successful:', {
        name: user.name,
        role: user.role,
        schoolId: user.schoolId
      });

      // Ensure the user object contains schoolId
      if (!user.schoolId) {
        console.warn('⚠️ Login response missing schoolId');
        return {
          success: false,
          error: 'Invalid user data: missing school ID'
        };
      }

      // Set state
      setToken(token);
      setUser(user);

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenantId', user.schoolId);

      // Set default headers for all API requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.defaults.headers.common['x-tenant-id'] = user.schoolId;

      return { success: true, user };
    } catch (err: any) {
      console.error('❌ Login error:', err);

      // Handle different error types
      if (err.response) {
        console.error('Server response:', err.response.data);
        return {
          success: false,
          error: err.response.data?.error || err.response.data?.message || 'Login failed. Please check your credentials.'
        };
      } else if (err.request) {
        console.error('No response from server');
        return {
          success: false,
          error: 'Network error. Please check your connection.'
        };
      } else {
        console.error('Request setup error:', err.message);
        return {
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        };
      }
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user:', user?.name);

    setToken(null);
    setUser(null);

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');

    // Clear axios headers
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['x-tenant-id'];
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!token || !user) return;

    try {
      console.log('🔄 Refreshing user data...');
      const response = await api.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': user.schoolId
        }
      });

      const refreshedUser = response.data;
      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      console.log('✅ User data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const hasRole = (user: { role?: string; roles?: string[] } | null, ...allowed: string[]): boolean => {
  if (!user) return false;
  const roles = [...(user.roles || []), user.role].filter(Boolean);
  return allowed.some(r => roles.includes(r));
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};