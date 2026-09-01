import { useState, useEffect, useRef } from 'react';
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { Turnstile } from '@marsidev/react-turnstile';

const authClient = createAuthClient({
  plugins: [emailOTPClient()]
});

type ViewState = 'login' | 'otp';

export default function AuthWidget({ returnUrl }: { returnUrl: string }) {
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<ViewState>('login');
  const [turnstileToken, setTurnstileToken] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Create a reference to control the Turnstile widget manually
  const turnstileRef = useRef<any>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!turnstileToken) return alert("Please wait for the security check to complete.");
    if (!email) return alert("Please enter your email.");
    
    // Capture the current token for this request
    const currentToken = turnstileToken;
    
    // Immediately clear state and reset the widget to generate a NEW token for future resends
    setTurnstileToken('');
    turnstileRef.current?.reset();
    
    setCountdown(30);
    setView('otp');
    setOtp(''); // Clear out any old code from the input field
    
    const { error } = await authClient.emailOtp.sendVerificationOtp({ 
      email, 
      type: 'sign-in',
      fetchOptions: {
        headers: { 'X-Turnstile-Token': currentToken }
      }
    });

    if (error) {
      alert("Failed to send access code. Please try again.");
      setView('login');
      setCountdown(0);
    }
  };

  const verifyOtp = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await authClient.signIn.emailOtp({ email, otp });
      if (error) throw error;
      if (data) window.location.href = returnUrl;
    } catch (err: any) {
      alert("Invalid or expired code.");
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload(); 
  };

  // --- LOADING STATE ---
  if (isPending) {
    return (
      <div className="flex justify-center items-center h-64 w-full max-w-[360px] mx-auto -mt-20">
        <div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- LOGGED IN VIEW ---
  if (session) {
    return (
      <div className="flex flex-col gap-6 max-w-[360px] w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl -mt-20">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Account</h1>
          <p className="text-sm text-gray-500">{session.user.email}</p>
        </div>
        
        <button onClick={handleLogout} className="w-full py-2.5 px-4 bg-gray-50 text-gray-900 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
          Sign out
        </button>
      </div>
    );
  }

  // --- LOGGED OUT FLOW ---
  return (
    <div className="flex flex-col gap-6 max-w-[360px] w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl -mt-20">
      
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {view === 'login' ? 'Log in' : 'Enter code'}
        </h2>
        {view === 'otp' && (
          <p className="text-sm text-gray-500">
            We sent a code to <span className="font-medium text-gray-900">{email}</span>
          </p>
        )}
      </div>

      {view === 'login' && (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="name@example.com" 
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all placeholder-gray-400"
            />
          </div>

          <button 
            onClick={handleSendOtp} 
            className="w-full py-2.5 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {view === 'otp' && (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="otp" className="sr-only">Verification code</label>
            <input 
              id="otp"
              type="text" 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              placeholder="000000"
              disabled={isVerifying}
              maxLength={6}
              className="w-full px-3 py-3 text-xl text-center tracking-[0.5em] font-medium border border-gray-300 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          
          <button 
            onClick={verifyOtp} 
            disabled={isVerifying || otp.length < 6}
            className="w-full py-2.5 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:bg-gray-300 disabled:text-gray-500 flex items-center justify-center min-h-[40px]"
          >
            {isVerifying ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              "Verify"
            )}
          </button>

          <div className="flex justify-between items-center mt-2">
            <button 
              onClick={() => {
                setView('login');
                setOtp('');
              }}
              disabled={isVerifying}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              &larr; Back
            </button>

            <button 
              onClick={handleSendOtp} 
              disabled={countdown > 0 || isVerifying}
              className="text-sm text-slate-900 font-medium hover:underline disabled:text-gray-400 disabled:no-underline transition-colors"
            >
              {countdown > 0 ? `Wait ${countdown}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {/* Renders globally across both views so Turnstile can quietly reset in the background */}
      <div className="flex justify-center overflow-hidden">
        <Turnstile 
          ref={turnstileRef}
          siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} 
          onSuccess={setTurnstileToken} 
        />
      </div>

    </div>
  );
}