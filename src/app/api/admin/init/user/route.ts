import { NewAdminAccountForm } from "@/forms/adminInit";
import { checkUserAlreadyExists, createAdminAccount } from "@/services/server/user";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, reqData: NewAdminAccountForm) => {
  const exists = await checkUserAlreadyExists();
  if (exists) {
    throw new ApiError(HttpStatusCode.BadRequest, "The first user is already exists.");
  }

  // Create the first user of the system
  const userId = await createAdminAccount(reqData);
  return {
    status: HttpStatusCode.Ok,
    data: userId,
  };
});
