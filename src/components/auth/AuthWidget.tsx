import { useState } from 'react';
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { Turnstile } from '@marsidev/react-turnstile';

type ViewState = 'select' | 'signup' | 'login' | 'otp';

export default function AuthWidget({ returnUrl }: { returnUrl: string }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<ViewState>('select');
  const [authType, setAuthType] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [turnstileToken, setTurnstileToken] = useState('');

  const authClient = createAuthClient({
    plugins: [emailOTPClient(), passkeyClient()],
    fetchOptions: {
      headers: { 'X-Turnstile-Token': turnstileToken }
    }
  });

  const handleSendOtp = async (type: 'sign-in' | 'sign-up') => {
    if (!turnstileToken) return alert("Please complete the security check.");
    if (!email) return alert("Please enter your email.");
    
    setAuthType(type);
    await authClient.emailOtp.sendVerificationOtp({ email, type });
    setView('otp');
  };

  const verifyOtp = async () => {
    if (authType === 'sign-in') {
      const { data } = await authClient.signIn.emailOtp({ email, otp });
      if (data) window.location.href = returnUrl;
    } else {
      // Better Auth requires a 'name' for new signups. We derive it from the email automatically.
      const name = email.split('@')[0];
      const { data } = await authClient.signUp.emailOtp({ email, otp, name });
      if (data) window.location.href = returnUrl;
    }
  };

  const loginWithPasskey = async () => {
    const { data } = await authClient.signIn.passkey();
    if (data) window.location.href = returnUrl;
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      
      {/* Back Button for Accessibility */}
      {view !== 'select' && (
        <button 
          onClick={() => setView(view === 'otp' ? (authType === 'sign-in' ? 'login' : 'signup') : 'select')}
          className="self-start text-sm text-gray-500 hover:text-slate-900 font-medium mb-2"
        >
          &larr; Back
        </button>
      )}

      {/* 1. INITIAL SELECTION */}
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

      {/* 2. SIGN UP VIEW */}
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

      {/* 3. LOG IN VIEW */}
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

      {/* 4. OTP VERIFICATION VIEW */}
      {view === 'otp' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Enter Code</h2>
          <p className="text-sm text-gray-500 mb-2">Sent to {email}</p>
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="Enter 6-digit code" 
            className="p-3 border border-gray-300 rounded-lg font-mono tracking-widest text-center text-lg outline-none focus:border-slate-900"
          />
          <button onClick={verifyOtp} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Verify & Continue
          </button>
        </div>
      )}
    </div>
  );
}