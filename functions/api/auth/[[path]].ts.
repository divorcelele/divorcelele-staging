import { getAuth } from "../../../src/lib/auth.server";

export const onRequest = async (context: any) => {
  console.log(`[DEBUG-2] [[path]].ts intercepted the request. Method: ${context.request.method}`);
  
  if (!context.env.DB) {
    console.log("[DEBUG-2] ERROR: Cloudflare DB binding is missing.");
    throw new Error("Cloudflare DB binding is missing. Ensure your D1 database is bound in your Cloudflare dashboard.");
  }

  console.log("[DEBUG-2] DB binding found, passing to Better Auth handler...");
  const auth = getAuth(context.env);
  return auth.handler(context.request);
};