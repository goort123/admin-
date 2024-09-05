"use server";

import { signIn } from "@/auth";
import { loginSchema } from "@/schemas";
import { z } from "zod";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { AuthError } from "next-auth";
import { getUserByEmail } from "@/services/user";
import bcrypt from "bcryptjs";
import { generateTwoFactorToken } from "@/services/two-factor-token";
import { sendTwoFactorEmail } from "@/services/mail";
import { cookies } from "next/headers";
import {
  getTwoFactorConfirmationByUserId,
  deleteTwoFactorConfirmationById,
} from "@/services/two-factor-confirmation";
import { isExpired, response, signJwt } from "@/lib/utils";

export const login = async (payload: z.infer<typeof loginSchema>) => {
  
  const validatedFields = loginSchema.safeParse(payload);
  if (!validatedFields.success) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid fields.",
      },
    });
  }

  const { email, password } = validatedFields.data;

  
  const existingUser = await getUserByEmail(email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Invalid credentials.",
      },
    });
  }

  
  const isPasswordMatch = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordMatch) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Invalid credentials.",
      },
    });
  }

  
  if (!existingUser.emailVerified) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Your email address is not verified yet. Please check your email.",
      },
    });
  }

  
  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    const existingTwoFactorConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);
    const hasExpired = isExpired(existingTwoFactorConfirmation?.expires!);

    
    if (existingTwoFactorConfirmation && hasExpired) {
      await deleteTwoFactorConfirmationById(existingTwoFactorConfirmation.id);
    }

    
    if (!existingTwoFactorConfirmation || hasExpired) {
      const cookieStore = cookies();
      const token = signJwt(validatedFields.data);
      cookieStore.set("credentials-session", token);

      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      await sendTwoFactorEmail(twoFactorToken.email, twoFactorToken.token);

      return response({
        success: true,
        code: 200,
        message: "Please confirm your two-factor authentication code.",
      });
    }
  }

  
  return await signInCredentials(email, password);
};


export const signInCredentials = async (email: string, password: string) => {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return response({
            success: false,
            error: {
              code: 401,
              message: "Invalid credentials.",
            },
          });

        case "OAuthAccountNotLinked":
          return response({
            success: false,
            error: {
              code: 403,
              message:
                "Another account already registered with the same Email Address. Please login the different one.",
            },
          });

        case "Verification":
          return response({
            success: false,
            error: {
              code: 422,
              message: "Verification failed. Please try again.",
            },
          });

        case "AuthorizedCallbackError":
          return response({
            success: false,
            error: {
              code: 422,
              message: "Authorization failed. Please try again.",
            },
          });

        default:
          return response({
            success: false,
            error: {
              code: 500,
              message: "Something went wrong.",
            },
          });
      }
    }

    throw error;
  }
};
