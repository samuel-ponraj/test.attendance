'use client'

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Check, Clock3, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { auth } from "@/lib/firebase";
import { browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, setPersistence } from "firebase/auth";

const REMEMBER_EMAIL_KEY = "attendance:remembered-email";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (rememberMe) window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);

      const userCredential = await login(email, password);
      const token = await userCredential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      const session = await response.json();

      if (!response.ok) throw new Error(session.error || "Failed to establish session");
      if (!session.role) throw new Error("Account not found. Please contact an admin.");

      toast.success("Welcome!");
      router.replace(session.role === "bos" ? "/bos" : `/${session.role}`);
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return toast.error("Enter your email address first");

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset link sent. Check your inbox.");
    } catch {
      toast.error("Unable to send the reset email");
    }
  };

  return (
    <main className="relative grid min-h-svh overflow-hidden bg-[#05070c] text-white lg:h-svh lg:grid-cols-[minmax(0,1.12fr)_minmax(400px,0.88fr)]">

      <section className="relative hidden min-w-0 flex-col border-r border-white/10 bg-[radial-gradient(circle_at_25%_70%,rgba(225,29,72,0.18),transparent_35%)] px-[clamp(28px,4vw,64px)] py-[clamp(22px,3vw,40px)] lg:flex">
        <Image src="/logo/KDA-logo-white.png" alt="Kingz Digital Attendance" width={160} height={68} priority />

        <div className="relative mx-auto my-auto w-full max-w-[600px] rounded-2xl border border-white/10 bg-gradient-to-br from-[#131823]/95 to-[#07090f] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45),0_0_60px_rgba(213,22,47,0.07)]">
          <div className="flex items-start justify-between">
            <div><span className="text-[10px] font-bold tracking-[0.16em] text-[#ef233c]">WORKFORCE OVERVIEW</span><h2 className="mt-1 text-lg font-semibold">Good morning, Admin</h2></div>
            <span className="rounded-full border border-[#272d3a] px-3 py-2 text-[10px] text-slate-400"><i className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400" />Live</span>
          </div>
          <div className="my-3 grid grid-cols-3 gap-2">
            {[[Users, "Team members", "128"], [Clock3, "On time today", "96"], [ShieldCheck, "On leave", "14"]].map(([Icon, label, value]) => (
              <div key={label} className="rounded-xl border border-[#212634] bg-[#0d111b] p-2.5"><div className="flex items-center gap-2 text-[9px] text-slate-400"><Icon size={15} className="text-[#ed253e]" />{label}</div><strong className="mt-1.5 block text-xl">{value}</strong></div>
            ))}
          </div>
          <div className="rounded-xl border border-[#202632] bg-[#090d15] p-4">
            <div className="flex justify-between text-[11px] text-slate-400"><span>Weekly attendance</span><strong className="text-base text-white">94.8%</strong></div>
            <svg className="mt-1 h-16 w-full" viewBox="0 0 600 150" aria-label="Weekly attendance trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ef233c" stopOpacity=".45"/><stop offset="1" stopColor="#ef233c" stopOpacity="0"/></linearGradient></defs><path fill="url(#area)" d="M0,126 C70,112 75,80 135,88 C195,98 205,48 275,65 C350,84 365,27 430,43 C490,57 518,10 600,23 L600,150 L0,150 Z"/><path fill="none" stroke="#ef233c" strokeWidth="3" d="M0,126 C70,112 75,80 135,88 C195,98 205,48 275,65 C350,84 365,27 430,43 C490,57 518,10 600,23"/></svg>
          </div>
          <div className="absolute -bottom-5 -right-3 flex min-w-[230px] items-center gap-2.5 rounded-xl border border-[#303644] bg-[#11151f] p-2.5 shadow-2xl"><span className="grid size-8 place-items-center rounded-full bg-[#dc1833]"><Check size={18}/></span><span className="text-[9px]"><strong className="block">Checked in successfully</strong><small className="text-slate-500">Today, 09:15 AM</small></span><small className="ml-auto rounded-full bg-emerald-950 px-2 py-1 text-emerald-400">On time</small></div>
        </div>

        <div className="mt-7 max-w-xl">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-rose-500"><Sparkles size={14}/>SMARTER TEAM MANAGEMENT</p>
          <h1 className="text-[clamp(28px,2.5vw,40px)] font-semibold leading-[1.08] tracking-tight">
            Attendance that works<br />
            <span className="text-rose-500">as hard as your team.</span>
          </h1>
          <p className="mt-4 max-w-xl text-xs leading-6 text-slate-400">
            Track time, manage people, and understand your workforce—all from one simple, secure platform.
          </p>
          <div className="mt-5 flex gap-5 text-[11px] text-slate-300">
            <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-rose-500" />Secure &amp; reliable</span>
            <span className="flex items-center gap-2"><BarChart3 size={18} className="text-rose-500" />Real-time insights</span>
            <span className="flex items-center gap-2"><Users size={18} className="text-rose-500" />Built for teams</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[400px]">
          <Image className="mb-8 lg:hidden" src="/logo/KDA-logo-white.png" alt="Kingz Digital Attendance" width={170} height={72} priority />

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl sm:p-7">
            <p className="text-xs font-semibold tracking-[0.18em] text-rose-500">WELCOME BACK</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-400">Enter your details to continue to your dashboard.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-slate-300">Email address</label>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-4 focus-within:border-rose-500">
                  <Mail size={18} className="text-slate-500" />
                  <input className="login-autofill h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm text-slate-300">Password</label>
                  <button className="text-xs text-rose-500 hover:text-rose-400" type="button" onClick={handleForgotPassword}>Forgot password?</button>
                </div>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-4 focus-within:border-rose-500">
                  <LockKeyhole size={18} className="text-slate-500" />
                  <input className="login-autofill h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                  <button type="button" className="text-slate-500 hover:text-white" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input className="size-4 accent-rose-600" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                Remember me on this device
              </label>

              <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 text-sm font-semibold hover:bg-rose-500 disabled:opacity-60" disabled={isLoading}>
                {isLoading ? <Loader2 size={19} className="animate-spin" /> : <>Sign in <ArrowRight size={19} /></>}
              </button>
            </form>

            <div className="mt-7 flex gap-3 border-t border-white/10 pt-5 text-xs text-slate-500">
              <ShieldCheck size={17} />
              <p><strong className="block text-slate-300">Secure sign in</strong>Your information is protected with enterprise-grade security.</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">© {new Date().getFullYear()} Kingz Digital Solutions. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
}
