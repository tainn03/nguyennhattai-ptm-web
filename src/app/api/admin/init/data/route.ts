import initialAdministrativeUnit from "@/seed/AdministrativeUnit/initialAdministrativeUnit";
import initialEmailTemplate from "@/seed/EmailTemplate/initialEmailTemplate";
import initialOrganizationInitialValue from "@/seed/OrganizationInitialValue/initialOrganizationInitialValue";
import initialResourceOperation from "@/seed/ResourceOperation/initialResourceOperation";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest) => {
  // Check authentication
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  const userId = Number(req.token.user.id);
  const administrativeUnitCount = await initialAdministrativeUnit(userId);
  const emailTemplateCount = await initialEmailTemplate(userId);
  const organizationInitialValueCount = await initialOrganizationInitialValue(userId);
  const resourceOperationCount = await initialResourceOperation(userId);
  return {
    status: HttpStatusCode.Ok,
    data: {
      administrativeUnitCount,
      emailTemplateCount,
      organizationInitialValueCount,
      resourceOperationCount,
    },
  };
});
