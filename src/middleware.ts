import { defineMiddleware } from "astro:middleware";
import { getAuth } from "./lib/auth.server";
import { env } from "cloudflare:workers";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  // 1. Verify Turnstile Token on OTP requests
  if (request.method === "POST" && url.pathname.includes("/email-otp/send-verification-otp")) {
    const token = request.headers.get("X-Turnstile-Token");
    if (!token) return new Response(JSON.stringify({ error: "Security check required" }), { status: 403 });

    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY as string);
    formData.append('response', token);
    formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: formData
    });
    
    const outcome = await verify.json() as any;
    if (!outcome.success) return new Response(JSON.stringify({ error: "Bot verification failed" }), { status: 403 });
  }

  // 2. Protect Account Pages
  if (url.pathname.startsWith('/account')) {
    const auth = getAuth(env);
    
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session) {
      return context.redirect(`/login?returnUrl=${encodeURIComponent(url.pathname)}`);
    }
  }

  return next();
});