export const prerender = false; // 👈 Add this line at the top

import { getAuth } from "../../../lib/auth.server";
import type { APIContext } from "astro";

export async function ALL(context: APIContext) {
  // Correctly access Cloudflare bindings in Astro SSR
  const env = context.locals.runtime.env;
  
  if (!env) {
    throw new Error("Cloudflare runtime bindings are missing. Ensure your Astro adapter is configured correctly.");
  }

  const auth = getAuth(env);
  return auth.handler(context.request);
}