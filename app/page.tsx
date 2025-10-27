"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to login page when component mounts
    router.push('/login');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Admin Dashboard
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Redirecting to Login...
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">
          If redirect doesn't work, <a href="/login" className="text-blue-600 hover:underline">click here</a>
        </p>
      </div>
    </main>
  );
}