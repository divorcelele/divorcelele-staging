export const prerender = false;

import { getAuth } from "../../../lib/auth.server";
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export async function ALL(context: APIContext) {
  if (!env.DB) {
    throw new Error("Cloudflare DB binding is missing. Ensure your D1 database is bound in your Cloudflare dashboard.");
  }

  const auth = getAuth(env);
  return auth.handler(context.request);
}