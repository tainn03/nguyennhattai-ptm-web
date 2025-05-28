import { PasswordEditForm } from "@/forms/passwordEdit";
import { isValidCurrentPassword } from "@/services/server/auth";
import { changePasswordUser } from "@/services/server/user";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: PasswordEditForm) => {
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  const { jwt, user } = req.token;
  const isValid = await isValidCurrentPassword(Number(user.id), data.currentPassword);
  if (!isValid) {
    throw new ApiError(HttpStatusCode.BadRequest, "The current password is invalid");
  }

  await changePasswordUser(jwt, user.id, data.newPassword);

  return { status: HttpStatusCode.Ok };
});
