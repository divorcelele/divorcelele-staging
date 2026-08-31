import { useState } from 'react';
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins/passkey";
import { Turnstile } from '@marsidev/react-turnstile';

export default function AuthWidget({ returnUrl }: { returnUrl: string }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [turnstileToken, setTurnstileToken] = useState('');

  const authClient = createAuthClient({
    plugins: [emailOTPClient(), passkeyClient()],
    fetchOptions: {
      headers: { 'X-Turnstile-Token': turnstileToken }
    }
  });

  const sendOtp = async () => {
    if (!turnstileToken) return alert("Please complete the security check.");
    await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    setStep('otp');
  };

  const verifyOtp = async () => {
    const { data } = await authClient.signIn.emailOtp({ email, otp });
    if (data) window.location.href = returnUrl;
  };

  const loginWithPasskey = async () => {
    const { data } = await authClient.signIn.passkey();
    if (data) window.location.href = returnUrl;
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm w-full mx-auto p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      {step === 'email' ? (
        <>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="name@example.com" 
            className="p-3 border border-gray-300 rounded-lg outline-none focus:border-slate-900"
          />
          
          <Turnstile siteKey="YOUR_CLOUDFLARE_SITE_KEY" onSuccess={setTurnstileToken} />
          
          <button onClick={sendOtp} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Send Login Code
          </button>
          
          <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest my-1">OR</div>
          
          <button onClick={loginWithPasskey} className="p-3 border border-gray-300 rounded-lg font-semibold text-slate-700 hover:bg-gray-50 transition">
            Sign in with Passkey
          </button>
        </>
      ) : (
        <>
          <input 
            type="text" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            placeholder="Enter 6-digit code" 
            className="p-3 border border-gray-300 rounded-lg font-mono tracking-widest text-center text-lg outline-none"
          />
          <button onClick={verifyOtp} className="p-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition">
            Verify & Login
          </button>
        </>
      )}
    </div>
  );
}