"use server";

import { loginSchema, twoFactorSchema } from "@/schemas";
import { z } from "zod";
import { getUserByEmail } from "@/services/user";
import {
  deleteTwoFactorTokenById,
  generateTwoFactorToken,
  getTwoFactorTokenByEmail,
} from "@/services/two-factor-token";
import { isExpired, response } from "@/lib/utils";
import { generateTwoFactorConfirmation } from "@/services/two-factor-confirmation";
import { signInCredentials } from "@/actions/login";
import { cookies } from "next/headers";
import { sendTwoFactorEmail } from "@/services/mail";

export const twoFactor = async (
  payload: z.infer<typeof twoFactorSchema>,
  credentials: z.infer<typeof loginSchema>
) => {
  
  const validatedFields = twoFactorSchema.safeParse(payload);
  if (!validatedFields.success) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid fields.",
      },
    });
  }

  const { code } = validatedFields.data;

  
  const existingUser = await getUserByEmail(credentials.email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Email address does not exist.",
      },
    });
  }

  
  const twoFactorToken = await getTwoFactorTokenByEmail(credentials.email);
  if (!twoFactorToken || twoFactorToken.token !== code) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid code.",
      },
    });
  }

  
  const hasExpired = isExpired(twoFactorToken.expires);
  if (hasExpired) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Code has been expired. Please resend the 2FA code to your email.",
      },
    });
  }

  
  await deleteTwoFactorTokenById(twoFactorToken.id);
  await generateTwoFactorConfirmation(existingUser.id);

  
  const cookieStore = cookies();
  cookieStore.delete("credentials-session");

  
  return await signInCredentials(credentials.email, credentials.password);
};


export const resendTwoFactor = async (email: string) => {
  
  const twoFactorToken = await generateTwoFactorToken(email);
  if (!twoFactorToken) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Failed to resend two factor authentication.",
      },
    });
  }

  
  await sendTwoFactorEmail(twoFactorToken.email, twoFactorToken.token);
  return response({
    success: true,
    code: 201,
    message: "Two factor authentication code has been sent to your email.",
  });
};
