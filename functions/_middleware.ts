export const onRequest = async (context: any) => {
   const { request, env, next } = context;
   const url = new URL(request.url);

   // 1. Verify Turnstile Token on OTP requests
   if (request.method === "POST" && url.pathname.includes("/email-otp/send-verification-otp")) {
     const token = request.headers.get("X-Turnstile-Token");
     if (!token) return new Response(JSON.stringify({ error: "Security check required" }), { status: 403 });
     
     const formData = new FormData();
     formData.append('secret', env.TURNSTILE_SECRET_KEY);
     formData.append('response', token);
     formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
     
     const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
       method: 'POST', body: formData
     });
     
     const outcome = await verify.json() as any;
     if (!outcome.success) {
       return new Response(JSON.stringify({ error: "Bot verification failed" }), { status: 403 });
     }
   } 

   // (Removed the /account redirect block entirely so the page can handle its own state)

   return next();
};