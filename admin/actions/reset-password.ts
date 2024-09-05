"use server";

import { z } from "zod";
import { resetPasswordSchema } from "@/schemas";
import { getUserByEmail } from "@/services/user";
import { generateResetPasswordToken } from "@/services/reset-password-token";
import { sendResetPasswordEmail } from "@/services/mail";
import { response } from "@/lib/utils";

export const resetPassword = async (payload: z.infer<typeof resetPasswordSchema>) => {
  
  const validatedFields = resetPasswordSchema.safeParse(payload);
  if (!validatedFields.success) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid fields.",
      },
    });
  }

  const { email } = validatedFields.data;

  
  const existingUser = await getUserByEmail(email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Email address does not exist.",
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

  
  const resetPasswordToken = await generateResetPasswordToken(email);
  await sendResetPasswordEmail(resetPasswordToken.email, resetPasswordToken.token);

  
  return response({
    success: true,
    code: 201,
    message: "Email has been sent. Please check to your email.",
  });
};
