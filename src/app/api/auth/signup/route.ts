import { EmailTemplateType } from "@prisma/client";

import { NEXTAUTH_URL } from "@/configs/environment";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { SignUpForm } from "@/forms/auth";
import { createAccountActivationToken } from "@/services/server/token";
import { checkEmailExists, checkPhoneNumberExists, createUser } from "@/services/server/user";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getFullName } from "@/utils/auth";
import { sendEmail } from "@/utils/email";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: SignUpForm, params) => {
  const { email, phoneNumber, firstName, lastName } = data;
  const isEmailExists = await checkEmailExists(email);
  if (isEmailExists) {
    throw new ApiError(HttpStatusCode.BadRequest, "This email is already exists.");
  }

  const isPhoneNumberExists = await checkPhoneNumberExists(phoneNumber);
  if (isPhoneNumberExists) {
    throw new ApiError(HttpStatusCode.Conflict, "This phone number is already exists.");
  }

  const userId = await createUser(data);
  if (!userId) {
    throw new ApiError(HttpStatusCode.InternalServerError, "An error occurred while creating the user.");
  }

  // Register using email/password
  if (!data.provider) {
    const token = await createAccountActivationToken(userId, data);
    const fullName = getFullName(firstName, lastName, params.locale || DEFAULT_LOCALE);
    sendEmail({
      toEmail: email,
      type: EmailTemplateType.ACCOUNT_ACTIVATION,
      data: {
        fullName,
        email,
        phoneNumber,
        activationLink: `${NEXTAUTH_URL}/auth/signup/activation?token=${token.value}`,
      },
    });
  }

  return { status: HttpStatusCode.Ok };
});
