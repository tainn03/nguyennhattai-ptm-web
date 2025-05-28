import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { RouteInputForm } from "@/forms/route";
import { checkRouteCodeExists, createRoute } from "@/services/server/route";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString, trim } from "@/utils/string";

export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: RouteInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { customerId, code } = trim(requestData);

  const isCodeExists = await checkRouteCodeExists(jwt, Number(organizationId), Number(customerId), ensureString(code));
  if (isCodeExists) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXISTED };
  }

  const result = await prisma.$transaction(async (prisma) => {
    return await createRoute(prisma, { ...requestData, organizationId, createdById: userId });
  });

  if (result) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
