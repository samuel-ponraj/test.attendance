'use client'
import { useAuth } from "../app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (userData?.role !== allowedRole) {
        const target = userData?.role === 'admin' ? '/admin' : '/member';
        router.replace(target);
      }
    }
  }, [user, userData, loading, router, allowedRole]);

  // Show a blank screen or loader while checking permissions
  if (loading || !user || userData?.role !== allowedRole) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return children;
}