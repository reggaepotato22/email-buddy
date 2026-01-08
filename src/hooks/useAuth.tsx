import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: null;
  session: null;
  role: 'admin';
  loading: false;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: true;
  isEditor: false;
  canEdit: true;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth disabled - all users have admin access
  const value: AuthContextType = {
    user: null,
    session: null,
    role: 'admin',
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    isAdmin: true,
    isEditor: false,
    canEdit: true
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
