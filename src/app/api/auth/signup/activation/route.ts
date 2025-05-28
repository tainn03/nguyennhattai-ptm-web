import { EmailTemplateType } from "@prisma/client";
import moment from "moment";

import { NEXTAUTH_URL } from "@/configs/environment";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { SignUpActiveForm, SignUpForm } from "@/forms/auth";
import { createAccountActivationToken, deactivateToken, getAccountActivationToken } from "@/services/server/token";
import { activeUser, checkUserConfirmed } from "@/services/server/user";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { UserInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { sendEmail } from "@/utils/email";
import { decodeJWT } from "@/utils/security";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (_req: ApiNextRequest, data: SignUpActiveForm, params) => {
  const user = await decodeJWT<UserInfo>(data.token);
  if (!user || !user.id || !user.email) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token is invalid format.");
  }

  const token = await getAccountActivationToken(data.token);
  if (!token || !token.data) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token does not exist.");
  }

  let registerData: SignUpForm | undefined;
  try {
    registerData = JSON.parse(token.data);
  } catch {
    // nothing
  }
  if (!registerData) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token data is invalid format.");
  }

  // Re-active account
  if (data.reActive) {
    const { email, phoneNumber, firstName, lastName } = registerData;
    const newToken = await createAccountActivationToken(user.id, registerData);
    const fullName = getFullName(firstName, lastName, params.locale || DEFAULT_LOCALE);

    sendEmail({
      toEmail: email,
      type: EmailTemplateType.ACCOUNT_ACTIVATION,
      data: {
        fullName,
        email,
        phoneNumber,
        activationLink: `${NEXTAUTH_URL}/auth/signup/activation?token=${newToken.value}`,
      },
    });

    return { status: HttpStatusCode.Ok };
  }

  await deactivateToken(token.id);

  // Check token expires
  const isValid = moment(token.expirationTime).isAfter();
  if (!isValid) {
    throw new ApiError(HttpStatusCode.RequestTimeout, "Token is expired.");
  }

  // Check user confirm status
  const isConfirmed = await checkUserConfirmed(user.email);
  if (isConfirmed) {
    return {
      status: HttpStatusCode.Ok,
      data: { email: user.email },
    };
  }

  // Active user
  const userId = await activeUser(user.id);
  if (!userId) {
    throw new ApiError(HttpStatusCode.InternalServerError, "An error occurred while activating the user.");
  }

  // Send email welcome to system
  sendEmail({
    toEmail: user.email,
    type: EmailTemplateType.WELCOME,
    data: {
      loginLink: `${NEXTAUTH_URL}/auth/signin`,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: { email: user.email },
  };
});
