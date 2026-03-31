'use client'
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { LogOut, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { toast } from "sonner";

const PendingPage = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingInitial, setCheckingInitial] = useState(true);

  // Wrapped in useCallback to prevent unnecessary re-renders
  const checkStatus = useCallback(async (isManual = false) => {
    if (!user?.email) return;

    if (isManual) setIsRefreshing(true);

    try {
      const allMemberRef = doc(db, "allMembers", user.email);
      const allMemberSnap = await getDoc(allMemberRef);

      if (allMemberSnap.exists()) {
        toast.success("Access approved! Redirecting...");
        router.push("/member");
      } else if (isManual) {
        toast.info("Still pending approval.");
      }
    } catch (error) {
      console.error("Error verifying approval status:", error);
      if (isManual) toast.error("Failed to check status. Try again.");
    } finally {
      setIsRefreshing(false);
      setCheckingInitial(false);
    }
  }, [user?.email, router]);

  // Initial check on mount
  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user, checkStatus]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black z-0 pointer-events-none" />
      
      <div className="w-full max-w-[450px] relative z-10">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-8 animate-scale-in border border-gray-800 text-center">
          
          <div className="mb-8">
            <Image 
              src="/logo/KDA-logo-white.png" 
              alt="Logo" 
              width={120} 
              height={60} 
              className="mx-auto mb-10"
              priority
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              {checkingInitial ? "Verifying Access" : "Application Pending"}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed px-2">
              {checkingInitial 
                ? "Checking your approval status..." 
                : "Your account is currently under review. Once approved, you will be able to access the member dashboard."
              }
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 text-left">
            <div className="flex items-start gap-3 text-blue-400">
              <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-normal">
                Need access immediately? Please reach out to your team lead or administrator to expedite your approval.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button 
              onClick={() => checkStatus(true)} // Pass true to show manual feedback
              disabled={isRefreshing || checkingInitial}
              className="w-full bg-primary hover:opacity-90 text-white py-6 flex gap-2 font-semibold"
            >
              {isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check Status
                </>
              )}
            </Button>
            
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center justify-center gap-2 transition-colors py-2"
            >
              <LogOut className="w-3 h-3" />
              Sign out of this account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;