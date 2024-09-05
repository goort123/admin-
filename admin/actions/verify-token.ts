"use server";

import { isExpired, response } from "@/lib/utils";
import { getUserByEmail, updateUserById } from "@/services/user";
import { deleteVerificationTokenById, getVerificationToken } from "@/services/verification-token";
import { redirect } from "next/navigation";

export const newVerification = async (token: string) => {
  
  const existingToken = await getVerificationToken(token);
  if (!existingToken) {
    return response({
      success: false,
      error: {
        code: 422,
        message: "Invalid token provided.",
      },
    });
  }

  
  const hasExpired = isExpired(existingToken.expires);
  if (hasExpired) {
    redirect("/resend");
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

  
  await updateUserById(existingUser.id, {
    emailVerified: new Date(),
    email: existingToken.email, 
  });
  
  await deleteVerificationTokenById(existingToken.id);

  return response({
    success: true,
    code: 200,
    message: "Your email address has been verified.",
  });
};
