"use server";

import { profileSchema } from "@/schemas";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { hashPassword, response } from "@/lib/utils";
import { getUserByEmail, getUserById, updateUserById } from "@/services/user";
import { update } from "@/auth";
import { deleteTwoFactorConfirmationByUserId } from "@/services/two-factor-confirmation";
import bcrypt from "bcryptjs";
import { generateVerificationToken } from "@/services/verification-token";
import { sendVerificationEmail } from "@/services/mail";

export const profile = async (payload: z.infer<typeof profileSchema>) => {
  
  const validatedFields = profileSchema.safeParse(payload);
  if (!validatedFields.success) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid fields.",
      },
    });
  }

  let { name, email, password, newPassword, isTwoFactorEnabled } = validatedFields.data;

  
  const user = await currentUser();
  if (!user) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Unauthorized.",
      },
    });
  }

  
  const existingUser = await getUserById(user.id);
  if (!existingUser) {
    return response({
      success: false,
      error: {
        code: 401,
        message: "Unauthorized.",
      },
    });
  }

  
  if (user.isOAuth) {
    email = undefined;
    password = undefined;
    newPassword = undefined;
    isTwoFactorEnabled = undefined;
  }

  
  if (email && email !== user.email) {
    
    const existingEmail = await getUserByEmail(email);
    if (existingEmail && user.id !== existingEmail.id) {
      return response({
        success: false,
        error: {
          code: 422,
          message: "The email address you have entered is already in use. Please use another one.",
        },
      });
    }

    
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(verificationToken.email, verificationToken.token);

    
    return response({
      success: true,
      code: 201,
      message: "Confirmation email sent. Please check your email.",
    });
  }

  
  if (!password || !newPassword) {
    password = undefined;
  }

  
  if (password && newPassword && existingUser.password) {
    
    const isPasswordMatch = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordMatch) {
      return response({
        success: false,
        error: {
          code: 401,
          message: "Incorrect password.",
        },
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    password = hashedPassword;
  }

  
  if (!isTwoFactorEnabled) {
    await deleteTwoFactorConfirmationByUserId(existingUser.id);
  }

  
  const updatedUser = await updateUserById(existingUser.id, {
    name,
    email,
    password,
    isTwoFactorEnabled,
  });

  
  await update({ user: { ...updatedUser } });

  
  return response({
    success: true,
    code: 204,
    message: "Profile updated.",
  });
};
