import { useState } from 'react';
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { Turnstile } from '@marsidev/react-turnstile';

// 1. Initialize client OUTSIDE the component so it doesn't cause infinite re-renders
const authClient = createAuthClient({
  plugins: [emailOTPClient(), passkeyClient()]
});

type ViewState = 'select' | 'signup' | 'login' | 'otp';

export default function AuthWidget({ returnUrl }: { returnUrl: string }) {
  // 2. Automatically fetch the user session securely on the client
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<ViewState>('select');
  const [authType, setAuthType] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleSendOtp = async (type: 'sign-in' | 'sign-up') => {
    if (!turnstileToken) return alert("Please complete the security check.");
    if (!email) return alert("Please enter your email.");
    
    setAuthType(type);
    
    // Pass the Turnstile token directly in the fetchOptions for this specific request
    await authClient.emailOtp.sendVerificationOtp({ 
      email, 
      type,
      fetchOptions: {
        headers: { 'X-Turnstile-Token': turnstileToken }
      }
    });
    setView('otp');
  };

  const verifyOtp = async () => {
    if (authType === 'sign-in') {
      const { data } = await authClient.signIn.emailOtp({ email, otp });
      if (data) window.location.href = returnUrl;
    } else {
      const name = email.split('@')[0]; // Auto-generate a name from the email
      const { data } = await authClient.signUp.emailOtp({ email, otp, name });
      if (data) window.location.href = returnUrl;
    }
  };

  const loginWithPasskey = async () => {
    const { data } = await authClient.signIn.passkey();
    if (data) window.location.href = returnUrl;
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload(); // Reloads the page to drop the user back into the auth flow
  };

  // 3. Show a loading state while Better Auth checks the user's session
  if (isPending) {
    return (
      <div className="flex justify-center items-center p-8 max-w-sm w-full mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm h-64">
        <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 4. Show the Logged-In Account View
  if (session) {
    return (
      <div className="flex flex-col gap-4 max-w-sm w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-gray-600 mb-6">Signed in as: <br/><strong className="text-slate-900">{session.user.email}</strong></p>
        <button onClick={handleLogout} className="p-3 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition w-full">
          Log Out
        </button>
      </div>
    );
  }

  // 5. Show the Logged-Out Auth Flow
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