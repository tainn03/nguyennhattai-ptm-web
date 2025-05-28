import moment from "moment";

import { APP_SECRET } from "@/configs/environment";
import { FORGOT_PASSWORD_EXPIRATION_SECONDS } from "@/constants/token";
import { ConfirmationForm } from "@/forms/forgotPassword";
import { deactivateToken, getForgotPasswordToken } from "@/services/server/token";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { encryptAES } from "@/utils/security";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (_req: ApiNextRequest, data: ConfirmationForm) => {
  const { code, email } = data;
  const token = await getForgotPasswordToken(code, email);
  if (token) {
    const now = new Date();
    const isValid = moment(token.expirationTime).isAfter(now);
    if (isValid) {
      await deactivateToken(token.id);

      const expirationTime = moment().add(FORGOT_PASSWORD_EXPIRATION_SECONDS, "seconds").toDate();
      const tokenData = {
        email,
        expirationTime,
      };
      const tokenKey = encryptAES(JSON.stringify(tokenData), APP_SECRET);
      return {
        status: HttpStatusCode.Ok,
        data: {
          tokenKey,
        },
      };
    }
  }

  return { status: HttpStatusCode.BadRequest };
});
