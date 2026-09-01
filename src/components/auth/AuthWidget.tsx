import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!turnstileToken) return alert("Please complete the security check.");
    if (!email) return alert("Please enter your email.");
    
    setCountdown(30);
    setView('otp');
    
    await authClient.emailOtp.sendVerificationOtp({ 
      email, 
      type: 'sign-in',
      fetchOptions: {
        headers: { 'X-Turnstile-Token': turnstileToken }
      }
    });
  };

  const verifyOtp = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await authClient.signIn.emailOtp({ email, otp });
      if (error) throw error;
      if (data) window.location.href = returnUrl;
    } catch (err: any) {
      alert("Invalid or expired access code.");
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload(); 
  };

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-64 w-full max-w-sm mx-auto">
        <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- LOGGED IN VIEW ---
  if (session) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 max-w-sm w-full mx-auto p-12 bg-white border border-gray-100 shadow-2xl rounded-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light tracking-wide text-gray-900">Welcome</h1>
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase">{session.user.email}</p>
        </div>
        
        <button onClick={handleLogout} className="w-full py-4 text-xs font-bold tracking-widest text-black uppercase border border-black hover:bg-black hover:text-white transition-colors duration-300">
          Sign Out
        </button>
      </div>
    );
  }

  // --- LOGGED OUT FLOW ---
  return (
    <div className="flex flex-col gap-10 max-w-sm w-full mx-auto p-12 bg-white shadow-2xl border border-gray-100 rounded-sm">
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-wide text-gray-900">
          {view === 'login' ? 'Access' : 'Verify'}
        </h2>
        <p className="text-[10px] text-gray-400 tracking-widest uppercase">
          {view === 'login' ? 'Enter your credentials' : 'Confirm your identity'}
        </p>
      </div>

      {view === 'login' && (
        <div className="flex flex-col gap-8">
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="EMAIL ADDRESS" 
            className="w-full pb-3 text-sm text-center font-light tracking-widest border-b border-gray-200 outline-none focus:border-black transition-colors placeholder-gray-300 uppercase"
          />
          
          <div className="flex justify-center -my-2">
            <Turnstile siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />
          </div>

          <button 
            onClick={handleSendOtp} 
            className="w-full py-4 bg-black text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors duration-300"
          >
            Continue
          </button>
        </div>
      )}

      {view === 'otp' && (
        <div className="flex flex-col gap-8">
          <p className="text-xs text-center text-gray-400 tracking-wider">
            Code sent to<br/><span className="text-black font-medium mt-1 inline-block">{email}</span>
          </p>
          
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="000000"
            disabled={isVerifying}
            maxLength={6}
            className="w-full pb-3 text-2xl text-center font-light tracking-[0.75em] border-b border-gray-200 outline-none focus:border-black transition-colors disabled:bg-transparent disabled:text-gray-300 pl-3"
          />
          
          <button 
            onClick={verifyOtp} 
            disabled={isVerifying || otp.length < 6}
            className="w-full py-4 bg-black text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors duration-300 disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center min-h-[50px]"
          >
            {isVerifying ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              "Authenticate"
            )}
          </button>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button 
              onClick={() => setView('login')}
              disabled={isVerifying}
              className="text-[10px] text-gray-400 hover:text-black tracking-widest uppercase transition-colors disabled:opacity-50"
            >
              &larr; Back
            </button>

            <button 
              onClick={handleSendOtp} 
              disabled={countdown > 0 || isVerifying}
              className="text-[10px] font-bold text-gray-400 hover:text-black tracking-widest uppercase transition-colors disabled:opacity-50"
            >
              {countdown > 0 ? `Wait ${countdown}s` : "Resend"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}