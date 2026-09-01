export const prerender = false;

import { getAuth } from "../../../lib/auth.server";
import type { APIContext } from "astro";

export async function ALL(context: APIContext) {
  const env = context.locals.runtime.env;

  if (!env) {
    throw new Error("Cloudflare runtime bindings are missing. Ensure your Astro adapter is configured correctly.");
  }

  const auth = getAuth(env);
  return auth.handler(context.request);
}