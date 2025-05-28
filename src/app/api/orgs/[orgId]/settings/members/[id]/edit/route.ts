import { HttpStatusCode } from "axios";

import { OrganizationMemberInputForm } from "@/forms/organizationMember";
import {
  checkOrganizationMemberEmailExists,
  checkOrganizationMemberUsernameExists,
  updateOrganizationMember,
} from "@/services/server/organizationMember";
import { changePasswordUser } from "@/services/server/user";
import { ApiError, ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";
import { errorExists } from "@/utils/yup";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: OrganizationMemberInputForm) => {
  const { jwt, organizationId, userId: updatedById } = getToken(req);

  // Check username exists
  const isUsernameExists = await checkOrganizationMemberUsernameExists(
    jwt,
    organizationId,
    ensureString(requestData.username),
    Number(requestData.id)
  );
  if (isUsernameExists) {
    return { status: HttpStatusCode.Conflict, code: "username", message: errorExists("org_setting_member.username") };
  }

  // Check email exists
  if (requestData.email) {
    const isEmailExists = await checkOrganizationMemberEmailExists(
      jwt,
      organizationId,
      ensureString(requestData.email),
      Number(requestData.id)
    );
    if (isEmailExists) {
      return { status: HttpStatusCode.Conflict, code: "email", message: errorExists("org_setting_member.email") };
    }
  }

  // Update Organization member
  await updateOrganizationMember({ ...requestData, organization: { id: organizationId } }, updatedById);

  // Update password
  if (requestData.member?.password) {
    const userId = Number(requestData.member.id);
    const result = await changePasswordUser(jwt, userId, requestData.member.password);
    if (!result) {
      throw new ApiError(HttpStatusCode.InternalServerError);
    }
  }

  return { status: HttpStatusCode.Ok };
});
