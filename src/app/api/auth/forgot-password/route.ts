import { EmailTemplateType, User } from "@prisma/client";

import { FORGOT_PASSWORD_EXPIRATION_SECONDS } from "@/constants/token";
import { createForgotPasswordToken } from "@/services/server/token";
import { getUserByEmail } from "@/services/server/user";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { sendEmail } from "@/utils/email";
import { withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: User) => {
  const email = ensureString(data.email);

  // Check email existed
  const user = await getUserByEmail(email);
  if (!user) {
    throw new ApiError(HttpStatusCode.BadRequest, "The user does not exist.");
  }

  // Create token
  const token = await createForgotPasswordToken(email);

  // Sent mail verification code
  sendEmail({
    toEmail: email,
    type: EmailTemplateType.VERIFICATION_CODE,
    data: {
      code: token.value,
      minutes: Math.trunc(FORGOT_PASSWORD_EXPIRATION_SECONDS / 60),
    },
  });

  return { status: HttpStatusCode.Ok };
});
