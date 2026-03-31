
import { CheckCircle, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function ApplicationSuccess() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 text-white bg-[url('/bg1.jpg')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="absolute inset-0 bg-black/70 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-green-500/20 rounded-full animate-bounce">
            <CheckCircle className="w-16 h-16 text-green-400" />
          </div>
        </div>

        <h1 className="text-4xl md:text-4xl font-extrabold mb-4 tracking-tight">
          Submission Success!
        </h1>
        
        <p className="text-lg text-gray-300 mb-8 leading-relaxed">
          Your application has been successfully logged.
        </p>

        {/* Action Button */}
        <div className="space-y-4 flex items-center justify-center">
        <Link href="/login">
          <Button
            className="group flex items-center justify-center w-80 px-6 py-6 text-lg font-bold text-white rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-lg "
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Login to Dashboard
          </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}