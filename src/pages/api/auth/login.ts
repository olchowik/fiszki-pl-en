import type { APIContext } from "astro";

import { badRequestResponse, createSuccessResponse, internalServerErrorResponse } from "../../../lib/errors";

export const prerender = false;

/**
 * POST /api/auth/login
 * Authenticates a user with email and password.
 */
export async function POST(context: APIContext): Promise<Response> {
  const { locals, cookies } = context;
  const supabase = locals.supabase;

  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequestResponse("Email and password are required");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return badRequestResponse(error.message);
    }

    // Set the session cookies
    if (data.session) {
      cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return createSuccessResponse({
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return internalServerErrorResponse();
  }
}
