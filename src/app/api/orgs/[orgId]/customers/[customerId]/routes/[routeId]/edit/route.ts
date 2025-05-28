import { HttpStatusCode } from "axios";

import { UpdateRouteInputForm } from "@/forms/route";
import { checkRouteExclusives, updateRouteByGraphQL } from "@/services/server/route";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: UpdateRouteInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { route, lastUpdatedAt } = requestData;

  const isErrorExclusives = await checkRouteExclusives(jwt, organizationId, Number(route.id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  const updatedRoute = await updateRouteByGraphQL(jwt, { ...route, organizationId, updatedById: userId });

  if (updatedRoute.id) {
    return { status: HttpStatusCode.Ok, data: updatedRoute.id };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
