import { getBasicOrganizationByCodeOrAlias } from "@/services/server/organization";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const GET = withExceptionHandler(async (req: ApiNextRequest, reqData, params) => {
  const codeOrAlias = ensureString(params.orgId);
  if (!codeOrAlias) {
    throw new ApiError(HttpStatusCode.BadGateway, "orgId cannot be null");
  }

  // Get basic organization information based on unique code
  const data = await getBasicOrganizationByCodeOrAlias(codeOrAlias);
  return {
    status: HttpStatusCode.Ok,
    data,
  };
});
