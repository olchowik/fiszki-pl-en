import type { APIContext } from "astro";

import { badRequestResponse, createSuccessResponse, internalServerErrorResponse } from "../../../lib/errors";

export const prerender = false;

/**
 * POST /api/auth/signup
 * Creates a new user account with email and password.
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

    if (password.length < 6) {
      return badRequestResponse("Password must be at least 6 characters");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return badRequestResponse(error.message);
    }

    // Set the session cookies if auto-confirmed (local dev)
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

    return createSuccessResponse(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        message: data.session ? "Account created successfully" : "Please check your email to confirm your account",
      },
      201
    );
  } catch (error) {
    console.error("Signup error:", error);
    return internalServerErrorResponse();
  }
}
