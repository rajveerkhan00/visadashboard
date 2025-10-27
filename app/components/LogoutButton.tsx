'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTokenExpiry');
    router.push('/login');
  };

  // Calculate remaining days without useAuth
  const calculateRemainingDays = (): number => {
    const tokenExpiry = localStorage.getItem('adminTokenExpiry');
    if (!tokenExpiry) return 0;
    
    const expiryTime = parseInt(tokenExpiry);
    const currentTime = new Date().getTime();
    const remainingTime = expiryTime - currentTime;
    
    if (remainingTime <= 0) return 0;
    return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
  };

  const remainingDays = calculateRemainingDays();

  return (
  <div className="mt-auto p-6 border-t border-gray-200 bg-white">
  <div className="flex flex-col items-end space-y-1 text-right">
    {/* Session Info */}
    <div className="flex items-center space-x-2 text-xs">
      <span className="text-gray-500 font-medium">Session expires in:</span>
      <span
        className={`font-semibold ${
          remainingDays <= 1
            ? "text-red-500"
            : remainingDays <= 3
            ? "text-amber-500"
            : "text-green-500"
        }`}
      >
        {remainingDays} {remainingDays === 1 ? "day" : "days"}
      </span>
    </div>

    {/* Sign Out Button */}
    <button
      onClick={handleLogout}
      className="w-40 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Sign Out
    </button>
  </div>
</div>

  );
}