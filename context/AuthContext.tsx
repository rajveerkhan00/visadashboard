'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AdminUser {
  email: string;
  name: string;
  role: string;
  loggedIn: boolean;
  loginTime: number;
  token: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  login: (user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  remainingDays: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [remainingDays, setRemainingDays] = useState<number>(0);

  useEffect(() => {
    // Check if user is logged in on component mount
    const validateSession = () => {
      const storedAdmin = localStorage.getItem('adminUser');
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      
      if (storedAdmin && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = new Date().getTime();
        
        if (currentTime < expiryTime) {
          // Token is still valid
          const adminData = JSON.parse(storedAdmin);
          setAdmin(adminData);
          
          // Calculate remaining days
          const daysRemaining = Math.ceil((expiryTime - currentTime) / (1000 * 60 * 60 * 24));
          setRemainingDays(daysRemaining);
        } else {
          // Token expired, clear storage
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminTokenExpiry');
        }
      }
    };

    validateSession();
  }, []);

  const login = (user: AdminUser) => {
    const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
    
    setAdmin(user);
    setRemainingDays(30);
    
    localStorage.setItem('adminUser', JSON.stringify(user));
    localStorage.setItem('adminTokenExpiry', expiryTime.toString());
  };

  const logout = () => {
    setAdmin(null);
    setRemainingDays(0);
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTokenExpiry');
  };

  const isAuthenticated = !!admin;

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated, remainingDays }}>
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