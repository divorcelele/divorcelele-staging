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

  // Dispatch event when session state changes to notify the parent Astro page
  useEffect(() => {
    if (!isPending) {
      const event = new CustomEvent('auth-state-changed', {
        detail: { isLoggedIn: !!session }
      });
      window.dispatchEvent(event);
    }
  }, [session, isPending]);

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
      if (data) {
        // Fire custom event to hide links immediately before redirect
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isLoggedIn: true } }));
        window.location.href = returnUrl;
      }
    } catch (err: any) {
      alert("Invalid or expired code.");
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isLoggedIn: false } }));
    window.location.reload();
  };

  // --- LOADING STATE ---
  if (isPending) {
    return (
      <div className="flex justify-center items-center h-64 w-full max-w-[360px] mx-auto">
        <div className="animate-spin h-6 w-6 border-2 border-[#21242C] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- LOGGED IN VIEW ---
  if (session) {
    return (
      <div className="flex flex-col gap-6 max-w-[360px] w-full mx-auto p-8 bg-[#FBF9F4] border border-[#DBD3C1] rounded-md shadow-sm font-sans">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-[22px] font-medium text-[#21242C]">Account</h1>
          <p className="text-[14px] text-[#4A4E58]">{session.user.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-transparent text-[#21242C] text-[14.5px] font-medium border border-[#21242C] rounded-md hover:bg-[#21242C] hover:text-[#F2EEE5] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21242C]"
        >
          Sign out
        </button>
      </div>
    );
  }

  // --- LOGGED OUT FLOW ---
  return (
    <div className="flex flex-col gap-6 max-w-[360px] w-full mx-auto p-8 bg-[#FBF9F4] border border-[#DBD3C1] rounded-md shadow-sm font-sans">

      <div className="text-center space-y-2">
        <h2 className="font-serif text-[22px] font-medium text-[#21242C]">
          {view === 'login' ? 'Log in' : 'Enter access code'}
        </h2>
        {view === 'otp' && (
          <p className="text-[14px] text-[#4A4E58]">
            Sent to <span className="font-semibold text-[#21242C]">{email}</span>
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
              className="w-full px-4 py-3 text-[14.5px] bg-white border border-[#DBD3C1] rounded-md outline-none focus:border-[#7A2E2E] focus:ring-1 focus:ring-[#7A2E2E] transition-all placeholder-[#4A4E58]/60 text-[#21242C]"
            />
          </div>

          <button
            onClick={handleSendOtp}
            className="w-full py-3 px-4 bg-[#21242C] text-[#F2EEE5] text-[14.5px] font-medium rounded-md hover:bg-[#4A4E58] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21242C] shadow-sm"
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
              className="w-full px-4 py-3.5 text-xl text-center tracking-[0.4em] font-medium bg-white border border-[#DBD3C1] rounded-md outline-none focus:border-[#7A2E2E] focus:ring-1 focus:ring-[#7A2E2E] transition-all disabled:bg-[#EAE4D6] disabled:text-[#4A4E58] text-[#21242C] placeholder-[#4A4E58]/30"
            />
          </div>

          <button
            onClick={verifyOtp}
            disabled={isVerifying || otp.length < 6}
            className="w-full py-3 px-4 bg-[#21242C] text-[#F2EEE5] text-[14.5px] font-medium rounded-md hover:bg-[#4A4E58] transition-colors disabled:bg-[#DBD3C1] disabled:text-[#F2EEE5] flex items-center justify-center min-h-[46px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21242C] shadow-sm"
          >
            {isVerifying ? (
              <div className="animate-spin h-5 w-5 border-2 border-[#F2EEE5] border-t-transparent rounded-full"></div>
            ) : (
              "Verify code"
            )}
          </button>

          <div className="flex justify-between items-center mt-2">
            <button
              onClick={() => {
                setView('login');
                setOtp('');
              }}
              disabled={isVerifying}
              className="text-[13.5px] text-[#4A4E58] hover:text-[#21242C] font-medium transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A2E2E] rounded-sm"
            >
              &larr; Back
            </button>

            <button
              onClick={handleSendOtp}
              disabled={countdown > 0 || isVerifying}
              className="text-[13.5px] text-[#21242C] font-semibold hover:underline disabled:text-[#4A4E58] disabled:no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A2E2E] rounded-sm"
            >
              {countdown > 0 ? `Wait ${countdown}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {/* Stays mounted to reset in the background, but becomes INVISIBLE on the OTP screen */}
      <div className={view === 'login' ? 'flex justify-center overflow-hidden pt-2 border-t border-[#DBD3C1]/50' : 'hidden'}>
        <Turnstile
          ref={turnstileRef}
          siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
        />
      </div>

    </div>
  );
}