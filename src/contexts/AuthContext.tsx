// Simplified AuthContext with mock authentication
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { setCurrentMockUser, mockUsers, type MockUser } from "../mocks";

type AuthContextType = {
  user: MockUser | null;
  profile: MockUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
  signUp: (email: string, password: string, profileData: any) => Promise<{ success: boolean; redirectPath?: string; error?: { message: string } | null }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; redirectPath?: string }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string) => string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MockUser | null>(() => {
    // Check localStorage for saved session
    const savedUser = localStorage.getItem('mockCurrentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  // Role-based redirect logic
  const getRoleBasedRedirect = useCallback((role?: string) => {
    const r = role || user?.role;

    const roleMap: Record<string, string> = {
      admin: '/secure-9821panel',
      sadmin: '/super-ctrl-92k1x',
      team_leader: '/teamleader',
      registration: '/regteam',
      building: '/buildteam',
      info_desk: '/infodesk',
      attendee: '/attendee',
      employer: '/employer',
      volunteer: '/volunteer',
    };

    return roleMap[r || ''] || '/attendee';
  }, [user]);

  // Mock sign up - just creates a session
  const signUp = async (email: string, _password: string, profileData: any) => {
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mock user
    const newUser: MockUser = {
      id: String(Date.now()),
      email,
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      personal_id: profileData.personal_id || '',
      role: profileData.role || 'attendee',
      phone: profileData.phone,
      university: profileData.university,
      faculty: profileData.faculty,
      gender: profileData.gender,
      profile_complete: true,
      created_at: new Date().toISOString()
    };

    setUser(newUser);
    setCurrentMockUser(newUser);
    setLoading(false);

    return {
      success: true,
      redirectPath: getRoleBasedRedirect(newUser.role),
      error: null
    };
  };

  // Mock sign in - accepts any credentials
  const signIn = async (email: string, _password: string) => {
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find or create user
    let mockUser = mockUsers.find(u => u.email === email);

    if (!mockUser) {
      // Create new mock user for any email
      mockUser = {
        id: String(Date.now()),
        email,
        first_name: email.split('@')[0],
        last_name: 'User',
        personal_id: String(Math.floor(Math.random() * 900000) + 100000),
        role: 'attendee',
        profile_complete: true,
        created_at: new Date().toISOString()
      };
    }

    setUser(mockUser);
    setCurrentMockUser(mockUser);
    setLoading(false);

    return {
      success: true,
      redirectPath: getRoleBasedRedirect(mockUser.role)
    };
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem('mockCurrentUser');
    setLoading(false);
  };

  // Has role checker
  const hasRole = useCallback((roles: string | string[]) => {
    if (!user?.role) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  }, [user?.role]);

  // Context value
  const contextValue = useMemo(() => ({
    user,
    profile: user, // Profile is same as user in mock
    loading,
    sessionLoaded: true, // Always loaded in mock
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    hasRole,
    getRoleBasedRedirect,
  }), [user, loading, hasRole, getRoleBasedRedirect]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};