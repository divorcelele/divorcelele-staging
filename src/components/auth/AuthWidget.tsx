import { useState, useEffect } from 'react';
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { Turnstile } from '@marsidev/react-turnstile';

const authClient = createAuthClient({
  plugins: [emailOTPClient(), passkeyClient()]
});

type ViewState = 'select' | 'signup' | 'login' | 'otp';

export default function AuthWidget({ returnUrl }: { returnUrl: string }) {
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<ViewState>('select');
  const [authType, setAuthType] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [turnstileToken, setTurnstileToken] = useState('');
  
  // New State variables for UI enhancements
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 30-Second Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (type: 'sign-in' | 'sign-up') => {
    if (!turnstileToken) return alert("Please complete the security check.");
    if (!email) return alert("Please enter your email.");
    
    setAuthType(type);
    setCountdown(30); // Start the 30-second countdown
    setView('otp');
    
    await authClient.emailOtp.sendVerificationOtp({ 
      email, 
      type,
      fetchOptions: {
        headers: { 'X-Turnstile-Token': turnstileToken }
      }
    });
  };

  const verifyOtp = async () => {
    setIsVerifying(true); // Start loading spinner
    try {
      if (authType === 'sign-in') {
        const { data, error } = await authClient.signIn.emailOtp({ email, otp });
        if (error) throw error;
        if (data) window.location.href = returnUrl;
      } else {
        const name = email.split('@')[0]; 
        const { data, error } = await authClient.signUp.emailOtp({ email, otp, name });
        if (error) throw error;
        if (data) window.location.href = returnUrl;
      }
    } catch (err: any) {
      alert(err.message || "Invalid or expired code");
      setIsVerifying(false); // Stop loading spinner on error
    }
  };

  const loginWithPasskey = async () => {
    try {
      const { data, error } = await authClient.signIn.passkey();
      if (error) throw error;
      if (data) window.location.href = returnUrl;
    } catch (err) {
      console.error("Passkey login failed", err);
    }
  };

  const registerPasskey = async () => {
    try {
      const { data, error } = await authClient.passkey.addPasskey();
      if (error) throw error;
      if (data) alert("Passkey registered successfully! You can now use Touch ID to log in.");
    } catch (err) {
      console.error("Failed to register passkey", err);
      alert("Failed to register passkey. Please try again.");
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload(); 
  };

  if (isPending) {
    return (
      <div className="flex justify-center items-center p-8 max-w-sm w-full mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm h-64">
        <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // LOGGED IN VIEW (Now includes Passkey Registration)
  if (session) {
    return (
      <div className="flex flex-col gap-4 max-w-sm w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-gray-600 mb-6">Signed in as: <br/><strong className="text-slate-900">{session.user.email}</strong></p>
        
        <button onClick={registerPasskey} className="p-3 bg-slate-100 text-slate-800 rounded-lg font-semibold hover:bg-slate-200 transition w-full mb-2">
          Register Passkey (Touch ID)
        </button>
        
        <button onClick={handleLogout} className="p-3 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition w-full">
          Log Out
        </button>
      </div>
    );
  }

  // LOGGED OUT FLOW
  return (
    <div className="flex flex-col gap-4 max-w-sm w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      {view !== 'select' && (
        <button 
          onClick={() => setView(view === 'otp' ? (authType === 'sign-in' ? 'login' : 'signup') : 'select')}
          className="self-start text-sm text-gray-500 hover:text-slate-900 font-medium mb-2 disabled:opacity-50"
          disabled={isVerifying}
        >
          &larr; Back
        </button>
      )}

      {view === 'select' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-center mb-2">Welcome</h2>
          <button onClick={() => setView('signup')} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Create an Account
          </button>
          <button onClick={() => setView('login')} className="p-3 border border-gray-300 rounded-lg font-semibold text-slate-700 hover:bg-gray-50 transition">
            Log In
          </button>
        </div>
      )}

      {view === 'signup' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Sign Up</h2>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="name@example.com" 
            className="p-3 border border-gray-300 rounded-lg outline-none focus:border-slate-900"
          />
          <Turnstile siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />
          <button onClick={() => handleSendOtp('sign-up')} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Send Sign Up Code
          </button>
        </div>
      )}

      {view === 'login' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Log In</h2>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="name@example.com" 
            className="p-3 border border-gray-300 rounded-lg outline-none focus:border-slate-900"
          />
          <Turnstile siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />
          <button onClick={() => handleSendOtp('sign-in')} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Send Login Code
          </button>
          
          <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest my-1">OR</div>
          
          <button onClick={loginWithPasskey} className="p-3 border border-gray-300 rounded-lg font-semibold text-slate-700 hover:bg-gray-50 transition">
            Sign in with Passkey
          </button>
        </div>
      )}

      {view === 'otp' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Enter Code</h2>
          <p className="text-sm text-gray-500 mb-2">Sent to {email}</p>
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="Enter 6-digit code"
            disabled={isVerifying}
            className="p-3 border border-gray-300 rounded-lg font-mono tracking-widest text-center text-lg outline-none focus:border-slate-900 disabled:bg-gray-50 disabled:text-gray-400"
          />
          
          <button 
            onClick={verifyOtp} 
            disabled={isVerifying || otp.length < 6}
            className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition disabled:bg-slate-400 flex items-center justify-center min-h-[48px]"
          >
            {isVerifying ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              "Verify & Continue"
            )}
          </button>

          <button 
            onClick={() => handleSendOtp(authType)} 
            disabled={countdown > 0 || isVerifying}
            className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive a code? Resend"}
          </button>
        </div>
      )}
    </div>
  );
}