"use server";

import { newPasswordSchema } from "@/schemas";
import {
  deleteResetPasswordTokenById,
  getResetPasswordToken,
} from "@/services/reset-password-token";
import { getUserByEmail, updateUserById } from "@/services/user";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, isExpired, response } from "@/lib/utils";

export const newPassword = async (payload: z.infer<typeof newPasswordSchema>, token: string) => {
  
  const validatedFields = newPasswordSchema.safeParse(payload);
  if (!validatedFields.success) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid fields.",
      },
    });
  }

  const { password } = validatedFields.data;

  
  const existingToken = await getResetPasswordToken(token);
  if (!existingToken) redirect("/");

  
  const hasExpired = isExpired(existingToken.expires);
  if (hasExpired) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Token has expired. Please resend to your email.",
      },
    });
  }

  
  const existingUser = await getUserByEmail(existingToken.email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Email address does not exist.",
      },
    });
  }

  
  const hashedPassword = await hashPassword(password);

  
  await updateUserById(existingUser.id, {
    password: hashedPassword,
  });
  
  await deleteResetPasswordTokenById(existingToken.id);

  
  return response({
    success: true,
    code: 200,
    message: "Your password has been reset successfully.",
  });
};
