'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Disable SSR for the dashboard content to avoid localStorage issues during build
const DashboardContent = dynamic(() => import('./dashcontent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
        <p className="mt-4 text-slate-700">Loading Dashboard...</p>
      </div>
    </div>
  ),
});

// Also disable SSR for Logout component
const Logout = dynamic(() => import('../components/LogoutButton'), {
  ssr: false,
});

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