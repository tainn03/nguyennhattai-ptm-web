import { HttpStatusCode } from "axios";

import { OrganizationMemberInputForm } from "@/forms/organizationMember";
import {
  checkOrganizationMemberEmailExists,
  checkOrganizationMemberUsernameExists,
  createOrganizationMember,
} from "@/services/server/organizationMember";
import { changePasswordUser } from "@/services/server/user";
import { ApiError, ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";
import { errorExists } from "@/utils/yup";

export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: OrganizationMemberInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);

  // Check username exists
  const isUsernameExists = await checkOrganizationMemberUsernameExists(
    jwt,
    organizationId,
    ensureString(requestData.username)
  );
  if (isUsernameExists) {
    return { status: HttpStatusCode.Conflict, code: "username", message: errorExists("org_setting_member.username") };
  }

  // Check email exists
  if (requestData.email) {
    const isEmailExists = await checkOrganizationMemberEmailExists(
      jwt,
      organizationId,
      ensureString(requestData.email)
    );
    if (isEmailExists) {
      return { status: HttpStatusCode.Conflict, code: "email", message: errorExists("org_setting_member.email") };
    }
  }

  // Create new Organization member
  const userId = await createOrganizationMember({ ...requestData, organization: { id: organizationId } }, createdById);

  // Update password of created member
  const result = await changePasswordUser(jwt, userId, ensureString(requestData.member?.password));
  if (!result) {
    throw new ApiError(HttpStatusCode.InternalServerError);
  }

  return { status: HttpStatusCode.Ok, data: result };
});
