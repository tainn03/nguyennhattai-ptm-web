import isObject from "lodash/isObject";
import moment from "moment";

import { APP_SECRET, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { ChangePasswordForm } from "@/forms/forgotPassword";
import { changePasswordUser, getUserByEmail } from "@/services/server/user";
import { AnyObject } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { decryptAES } from "@/utils/security";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (_req: ApiNextRequest, data: ChangePasswordForm) => {
  const { email, password, tokenKey } = data;
  const decryptedData = decryptAES(tokenKey, APP_SECRET);

  const tokenData: AnyObject = JSON.parse(decryptedData);
  if (!isObject(tokenData)) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token is invalid.");
  }

  const now = new Date();
  const isValidTokenKey = moment(tokenData.expirationTime).isAfter(now);
  if (!isValidTokenKey || tokenData.email !== email) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token is expired.");
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new ApiError(HttpStatusCode.BadRequest, "The user does not exist.");
  }

  const result = await changePasswordUser(STRAPI_TOKEN_KEY, user.id, password);
  if (!result?.id) {
    throw new ApiError(HttpStatusCode.BadRequest, "An error occurred while changing the password.");
  }

  return { status: HttpStatusCode.Ok };
});
