'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmiratesIDClearance from './dashcontent';
import Logout from '../components/LogoutButton';


function DashboardContent() {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateSession = () => {
      const adminData = localStorage.getItem('adminUser');
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      
      if (!adminData || !tokenExpiry) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      const expiryTime = parseInt(tokenExpiry);
      const currentTime = new Date().getTime();
      
      if (currentTime >= expiryTime) {
        console.log('Session expired, redirecting to login');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminTokenExpiry');
        router.push('/login');
        return;
      }

      // Session is valid
      console.log('Session validated, remaining time:', 
        Math.round((expiryTime - currentTime) / (1000 * 60 * 60 * 24)) + ' days');
      setIsValidating(false);
    };

    validateSession();
  }, [router]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
          <p className="mt-4 text-slate-700">Validating session...</p>
        </div>
      </div>
    );
  }

  return <EmiratesIDClearance />;
}

export default function DashboardPage() {
  return (
    <>
    <Logout />
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
          <p className="mt-4 text-slate-700">Loading Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
    </>
  );
}