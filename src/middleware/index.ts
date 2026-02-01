import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { defineMiddleware } from "astro:middleware";

import type { Database } from "../db/database.types";

/**
 * Astro middleware that creates a per-request Supabase client with proper auth context.
 * This handles both cookie-based authentication (for browser requests) and
 * Bearer token authentication (for API requests).
 */
export const onRequest = defineMiddleware((context, next) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

  // Create a Supabase client with cookie handling for SSR
  context.locals.supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Parse cookies and ensure value is always defined
        const cookies = parseCookieHeader(context.request.headers.get("Cookie") ?? "");
        return cookies
          .filter((cookie): cookie is { name: string; value: string } => cookie.value !== undefined)
          .map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
    // Handle Authorization header for API requests
    global: {
      headers: {
        Authorization: context.request.headers.get("Authorization") ?? "",
      },
    },
  });

  return next();
});
