'use client'
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a small delay before redirect (to show spinner), you can remove this if you don't need a delay
    setLoading(true);
    setTimeout(() => {
      router.replace('/login');
    }, 1000); // Redirect after 1 second (adjust the delay as needed)
    setLoading(false);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {loading && (
        <div className="spinner">
          {/* Add your spinner component or icon here */}
          <svg
            className="animate-spin h-10 w-10 text-gray-800"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  );
}
