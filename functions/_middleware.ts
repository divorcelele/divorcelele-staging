export const onRequest = async (context: any) => {
   const { request, env, next } = context;
   const url = new URL(request.url);

   console.log(`[DEBUG-1] Middleware received ${request.method} request for: ${url.pathname}`);

   // 1. Verify Turnstile Token on OTP requests
   if (request.method === "POST" && url.pathname.includes("/email-otp/send-verification-otp")) {
     console.log("[DEBUG-1] Intercepted OTP POST request, checking Turnstile...");
     
     const token = request.headers.get("X-Turnstile-Token");
     if (!token) {
       console.log("[DEBUG-1] Missing Turnstile token");
       return new Response(JSON.stringify({ error: "Security check required" }), { status: 403 });
     }
     
     const formData = new FormData();
     formData.append('secret', env.TURNSTILE_SECRET_KEY);
     formData.append('response', token);
     formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
     
     const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
       method: 'POST', body: formData
     });
     
     const outcome = await verify.json() as any;
     if (!outcome.success) {
       console.log("[DEBUG-1] Turnstile verification failed");
       return new Response(JSON.stringify({ error: "Bot verification failed" }), { status: 403 });
     }
     console.log("[DEBUG-1] Turnstile passed, proceeding to next()");
   } 

   // 2. Protect Account Pages via subrequest
   if (url.pathname.startsWith('/account')) {
     const cookieHeader = request.headers.get('Cookie') || '';
     const sessionReq = await fetch(new URL('/api/auth/get-session', request.url).toString(), {
       headers: { 'Cookie': cookieHeader }
     });
     
     if (!sessionReq.ok) {
        return Response.redirect(new URL('/login', request.url).toString(), 302);
     }

     const sessionData = await sessionReq.json() as any;
     if (!sessionData?.session) {
       return Response.redirect(new URL('/login', request.url).toString(), 302);
     }
   } 

   return next();
};