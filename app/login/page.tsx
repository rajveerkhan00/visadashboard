'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface AdminUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const router = useRouter();

  // Check for existing valid token on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      const adminData = localStorage.getItem('adminUser');
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      
      if (adminData && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = new Date().getTime();
        
        if (currentTime < expiryTime) {
          // Token is still valid, redirect to dashboard
          console.log('Valid session found, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // Token expired, clear storage
          console.log('Session expired, clearing storage');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminTokenExpiry');
        }
      }
    };

    checkExistingSession();
  }, [router]);

  // Fetch admin users from Firestore
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const adminQuery = query(collection(db, 'adminlogin'));
        const querySnapshot = await getDocs(adminQuery);
        
        const admins: AdminUser[] = [];
        querySnapshot.forEach((doc) => {
          admins.push({
            id: doc.id,
            ...doc.data()
          } as AdminUser);
        });
        
        setAdminUsers(admins);
        console.log('Loaded admin users:', admins);
      } catch (error) {
        console.error('Error fetching admin users:', error);
        setError('Failed to load admin configuration');
      } finally {
        setIsLoadingAdmins(false);
      }
    };

    fetchAdminUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      // Check if credentials match any admin user
      const matchedAdmin = adminUsers.find(admin => 
        admin.email.toLowerCase() === email.toLowerCase() && 
        admin.password === password
      );

      if (matchedAdmin) {
        // Calculate expiry time (30 days from now)
        const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
        
        // Store admin session with token expiry
        const adminSession = {
          email: matchedAdmin.email,
          name: matchedAdmin.name,
          role: matchedAdmin.role,
          loggedIn: true,
          loginTime: new Date().getTime(),
          token: generateToken()
        };

        localStorage.setItem('adminUser', JSON.stringify(adminSession));
        localStorage.setItem('adminTokenExpiry', expiryTime.toString());
        
        console.log('Login successful for:', matchedAdmin.email);
        console.log('Token expires at:', new Date(expiryTime).toLocaleString());
        
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Generate a simple token (you can enhance this for production)
  const generateToken = (): string => {
    return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  // Auto-fill for testing (remove in production)
  const autoFill = (admin: AdminUser) => {
    setEmail(admin.email);
    setPassword(admin.password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your administrator account
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Stay logged in for 30 days
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white text-gray-900"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white text-gray-900"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading || isLoadingAdmins}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>

              {/* Signup Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need an admin account?{' '}
                  <Link 
                    href="/signup" 
                    className="font-medium text-gray-900 hover:text-gray-700 transition-colors"
                  >
                    Create one here
                  </Link>
                </p>
              </div>
            </form>

            {/* Admin Users List (for testing - remove in production) */}
            {adminUsers.length > 0 && process.env.NODE_ENV === 'development' && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Test Accounts:</h3>
                <div className="space-y-2">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">{admin.name}</div>
                        <div className="text-xs text-gray-500">{admin.email}</div>
                      </div>
                      <button
                        onClick={() => autoFill(admin)}
                        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        Fill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Secure admin access • 30-day automatic login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}