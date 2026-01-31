
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to simulate a database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('atla_session_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    await delay(500); // Simulate network request
    
    const usersStr = localStorage.getItem('atla_users_db');
    const users = usersStr ? JSON.parse(usersStr) : [];
    
    // Find user by username OR email
    const foundUser = users.find((u: any) => 
      (u.username === identifier || u.email === identifier) && u.password === password
    );

    if (foundUser) {
      const userObj: User = {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email
      };
      setUser(userObj);
      localStorage.setItem('atla_session_user', JSON.stringify(userObj));
      return true;
    }
    
    return false;
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    await delay(500); // Simulate network request

    const usersStr = localStorage.getItem('atla_users_db');
    const users = usersStr ? JSON.parse(usersStr) : [];

    // Check if exists
    if (users.find((u: any) => u.username === username || u.email === email)) {
      return false; // User exists
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      email,
      password // Note: In a real app, never store plain text passwords!
    };

    users.push(newUser);
    localStorage.setItem('atla_users_db', JSON.stringify(users));

    // Auto login after signup
    const userObj: User = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    };
    setUser(userObj);
    localStorage.setItem('atla_session_user', JSON.stringify(userObj));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('atla_session_user');
    // We reload the page to ensure all collection states are reset cleanly
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
